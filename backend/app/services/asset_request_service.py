"""
Asset Request service layer - Database operations for asset requests (Asynchronous)
"""
import uuid
from uuid import UUID
from datetime import datetime, timedelta, timezone
import asyncio
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc
from ..models.models import AssetRequest, User, Asset, PurchaseOrder, PurchaseInvoice, ProcurementLog
from ..schemas.asset_request_schema import AssetRequestCreate, AssetRequestUpdate, AssetRequestResponse
from ..services import procurement_service
from ..services.notification_service import NotificationService
from ..utils.state_machine import validate_state_transition


# Root Fix: Centralized status-to-owner mapping
STATUS_MAP = {
    "SUBMITTED": ("MANAGER", None),
    "MANAGER_APPROVED": ("IT_MANAGEMENT", None),
    "IT_APPROVED": ("MANAGER", None),
    "MANAGER_CONFIRMED_IT": ("PROCUREMENT", "PROCUREMENT_REQUESTED"),
    "PROCUREMENT_REQUESTED": ("PROCUREMENT", "PROCUREMENT_REQUESTED"),
    "PO_UPLOADED": ("PROCUREMENT", "PO_UPLOADED"),
    "PO_VALIDATED": ("FINANCE", "PO_VALIDATED"),
    "FINANCE_APPROVED": ("MANAGER", "FINANCE_APPROVED"),
    "MANAGER_CONFIRMED_BUDGET": ("ASSET_MANAGER", "QC_PENDING"),
    "QC_PENDING": ("ASSET_MANAGER", "QC_PENDING"),
    "QC_FAILED": ("PROCUREMENT", "QC_FAILED"),
    "USER_ACCEPTANCE_PENDING": ("END_USER", "USER_ACCEPTANCE_PENDING"),
    "USER_REJECTED": ("PROCUREMENT", "USER_REJECTED"),
    "MANAGER_CONFIRMED_ASSIGNMENT": ("MANAGER", "ASSIGNMENT"),
    "IN_USE": ("END_USER", "COMPLETED"),
    "FULFILLED": ("END_USER", "COMPLETED"),
    "MANAGER_REJECTED": ("SYSTEM", "REJECTED"),
    "IT_REJECTED": ("SYSTEM", "REJECTED"),
    "CLOSED": ("SYSTEM", "CLOSED")
}

def sync_request_state(db_request: AssetRequest):
    """Update current_owner_role and procurement_stage based on unified STATUS_MAP"""
    owner_role, stage = STATUS_MAP.get(db_request.status, (None, None))
    db_request.current_owner_role = owner_role
    db_request.procurement_stage = stage


from sqlalchemy.orm import joinedload

async def _populate_requester_info(db: AsyncSession, db_request: AssetRequest, user_role: str = None) -> AssetRequestResponse:
    """Helper to add requester name/email and procurement info (role-sensitive)"""
    # Note: requester relationship should be pre-loaded for efficiency
    res = AssetRequestResponse.model_validate(db_request)
    
    if db_request.requester:
        res.requester_name = db_request.requester.full_name
        res.requester_email = db_request.requester.email
        res.requester_department = db_request.requester.department
    
    # Step 6: Role-Based Visibility (Backend Enforced)
    if user_role in ["PROCUREMENT", "FINANCE", "ADMIN"]:
        # Fetch current PO
        po_query = select(PurchaseOrder).filter(PurchaseOrder.asset_request_id == db_request.id).order_by(desc(PurchaseOrder.created_at))
        po_result = await db.execute(po_query)
        po = po_result.scalars().first()
        
        if po:
            res.purchase_order = {
                "id": po.id,
                "vendor_name": po.vendor_name,
                "total_cost": po.total_cost,
                "status": po.status,
                "po_pdf_path": po.po_pdf_path,
                "extracted_data": po.extracted_data
            }
            
            # Fetch Invoice linked to this PO
            inv_query = select(PurchaseInvoice).filter(PurchaseInvoice.purchase_order_id == po.id)
            inv_result = await db.execute(inv_query)
            invoice = inv_result.scalars().first()
            
            if invoice:
                res.purchase_invoice = {
                    "purchase_date": invoice.purchase_date.isoformat() if invoice.purchase_date else None,
                    "total_amount": invoice.total_amount,
                    "invoice_pdf_path": invoice.invoice_pdf_path
                }
        
        # Fetch detailed procurement logs
        logs_query = select(ProcurementLog).filter(ProcurementLog.reference_id == db_request.id).order_by(desc(ProcurementLog.created_at))
        logs_result = await db.execute(logs_query)
        logs = logs_result.scalars().all()
        
        res.procurement_logs = [
            {"action": l.action, "performed_by": l.performed_by, "timestamp": l.created_at.isoformat(), "metadata": l.metadata_} 
            for l in logs
        ]
        
    elif user_role == "IT_MANAGEMENT":
        po_query = select(PurchaseOrder).filter(PurchaseOrder.asset_request_id == db_request.id)
        po_result = await db.execute(po_query)
        po = po_result.scalars().first()
        if po:
            res.purchase_order = {
                "status": po.status,
                "vendor_name": po.vendor_name
            }
            
    # --- Virtual Field Enrichment from DB (or fallback to map) ---
    res.current_owner_role = db_request.current_owner_role or STATUS_MAP.get(db_request.status, (None, None))[0]
    res.procurement_stage = db_request.procurement_stage or STATUS_MAP.get(db_request.status, (None, None))[1]
            
    return res


async def get_asset_request_by_id(db: AsyncSession, request_id: UUID, user_role: str = None) -> Optional[AssetRequestResponse]:
    """
    Get an asset request by ID with the requester relationship pre-loaded
    """
    result = await db.execute(
        select(AssetRequest).options(joinedload(AssetRequest.requester)).filter(AssetRequest.id == request_id)
    )
    request = result.scalars().first()
    if request:
        return await _populate_requester_info(db, request, user_role=user_role)
    return None


async def get_asset_request_by_id_db(db: AsyncSession, request_id: UUID) -> Optional[AssetRequest]:
    """
    Get an asset request by ID (returns DB model, not response) with requester pre-loaded
    """
    result = await db.execute(
        select(AssetRequest).options(joinedload(AssetRequest.requester)).filter(AssetRequest.id == request_id)
    )
    return result.scalars().first()


async def get_user_by_id_db(db: AsyncSession, user_id: UUID) -> Optional[User]:
    """
    Get a user by ID (returns DB model, not response)
    """
    result = await db.execute(select(User).filter(User.id == user_id))
    return result.scalars().first()


async def create_asset_request(db: AsyncSession, request: AssetRequestCreate, initial_status: str = "SUBMITTED") -> AssetRequestResponse:
    """
    [DEPRECATED] Use create_asset_request_v2 which derives identity from JWT.
    """
    return await create_asset_request_v2(db, request, requester_id=getattr(request, 'requester_id', None), initial_status=initial_status)

_asset_request_creation_locks = {}

async def create_asset_request_v2(db: AsyncSession, request: AssetRequestCreate, requester_id: UUID, initial_status: str = "SUBMITTED") -> AssetRequestResponse:
    """
    Create a new asset request with explicit requester_id (derived from JWT).
    Includes a duplicate check using an asyncio.Lock to prevent multiple identical requests within 60 seconds.
    """
    requester_id_str = str(requester_id)
    if requester_id_str not in _asset_request_creation_locks:
        _asset_request_creation_locks[requester_id_str] = asyncio.Lock()
        
    async with _asset_request_creation_locks[requester_id_str]:
        # 1. Check for recent identical request (Duplicate Prevention)
        since = datetime.now(timezone.utc) - timedelta(seconds=60)
        dup_query = select(AssetRequest).options(joinedload(AssetRequest.requester)).filter(
            AssetRequest.requester_id == requester_id,
            AssetRequest.asset_name == request.asset_name,
            AssetRequest.asset_type == request.asset_type,
            AssetRequest.justification == request.justification,
            AssetRequest.created_at >= since
        )
        dup_result = await db.execute(dup_query)
        existing_request = dup_result.scalars().first()

        if existing_request:
            print(f"[DUPLICATE_PREVENTION] Returning existing asset request {existing_request.id} for user {requester_id}")
            return await _populate_requester_info(db, existing_request)

        # 2. Create new request if no duplicate found
        db_request = AssetRequest(
            id=uuid.uuid4(),
            requester_id=requester_id,
            asset_id=request.asset_id,
            asset_name=request.asset_name,
            asset_type=request.asset_type,
            asset_ownership_type=request.asset_ownership_type,
            asset_model=request.asset_model,
            asset_vendor=request.asset_vendor,
            serial_number=request.serial_number,
            os_version=request.os_version,
            cost_estimate=request.cost_estimate,
            justification=request.justification,
            business_justification=request.business_justification,
            specifications=request.specifications or {},
            status=initial_status,
            manager_approvals=[]
        )
        sync_request_state(db_request)
        db.add(db_request)
        await db.commit()
        # Pre-fetch requester for the response
        query = select(AssetRequest).options(joinedload(AssetRequest.requester)).filter(AssetRequest.id == db_request.id)
        result = await db.execute(query)
        db_request = result.scalars().first()
        return await _populate_requester_info(db, db_request)


async def update_asset_request_status_with_validation(
    db: AsyncSession,
    request_id: UUID,
    new_status: str,
    user_role: str,
    reviewer_id: Optional[UUID] = None,
    reviewer_name: Optional[str] = None,
    reason: Optional[str] = None,
    decision: Optional[str] = None
) -> Optional[AssetRequestResponse]:
    """
    Update asset request status with state machine validation
    """
    result = await db.execute(
        select(AssetRequest).options(joinedload(AssetRequest.requester)).filter(AssetRequest.id == request_id)
    )
    db_request = result.scalars().first()
    if not db_request:
        return None
    
    
    # MANDATORY: Enforce rejection reason for all REJECTED states
    if new_status.endswith("_REJECTED") and not reason:
        raise ValueError(f"Rejection reason is mandatory when transitioning to {new_status}")
    
    # Validate state transition
    is_valid, error_msg = validate_state_transition(
        current_status=db_request.status,
        new_status=new_status,
        user_role=user_role,
        asset_ownership_type=db_request.asset_ownership_type
    )
    
    if not is_valid:
        raise ValueError(error_msg)
    
    # Update status
    db_request.status = new_status
    db_request.updated_at = datetime.now()
    
    # Record reviewer info
    if reviewer_id:
        if db_request.manager_approvals is None:
            db_request.manager_approvals = []
        db_request.manager_approvals.append({
            "reviewer_id": reviewer_id,
            "reviewer_name": reviewer_name or reviewer_id,
            "decision": new_status,
            "reason": reason,
            "timestamp": datetime.now().isoformat(),
            "type": "STATUS_CHANGE"
        })
    
    sync_request_state(db_request)
    await db.commit()
    await db.refresh(db_request)
    return await _populate_requester_info(db, db_request, user_role=user_role)


async def update_it_review_status(
    db: AsyncSession,
    request_id: UUID,
    new_status: str,
    reviewer_id: UUID,
    reviewer_name: str,
    decision: str,
    reason: Optional[str] = None
) -> Optional[AssetRequestResponse]:
    """
    Update IT review status with automated inventory routing.
    
    When IT approves a Company-Owned request:
    - Checks inventory for matching assets
    - If available: Reserves asset and routes to USER_ACCEPTANCE_PENDING
    - If not available: Routes to PROCUREMENT_REQUESTED
    """
    print(f"[DEBUG] update_it_review_status: Looking for request_id={request_id}, new_status={new_status}")
    result = await db.execute(
        select(AssetRequest).options(joinedload(AssetRequest.requester)).filter(AssetRequest.id == request_id)
    )
    db_request = result.scalars().first()
    if not db_request:
        print(f"[DEBUG] update_it_review_status: Request {request_id} not found in database")
        return None
    print(f"[DEBUG] update_it_review_status: Found request {request_id} with status={db_request.status}")

    # Note: Auto-routing logic has been moved to manager_confirm_stage()
    # IT approval now simply sets status to IT_APPROVED
    # Manager must confirm before auto-routing occurs

    is_valid, error_msg = validate_state_transition(
        current_status=db_request.status,
        new_status=new_status,
        user_role="IT_MANAGEMENT",
        asset_ownership_type=db_request.asset_ownership_type
    )
    
    if not is_valid:
        raise ValueError(error_msg)

    db_request.status = new_status
    db_request.it_reviewed_by = reviewer_id
    db_request.it_reviewed_at = datetime.now()

    if db_request.manager_approvals is None:
        db_request.manager_approvals = []
    
    db_request.manager_approvals.append({
        "reviewer_id": str(reviewer_id),
        "reviewer_name": reviewer_name,
        "decision": decision,
        "reason": reason,
        "timestamp": datetime.now().isoformat(),
        "type": "IT_REVIEW",
    })

    sync_request_state(db_request)
    await db.commit()
    await db.refresh(db_request)
    return await _populate_requester_info(db, db_request, user_role="IT_MANAGEMENT")


async def update_procurement_finance_status(
    db: AsyncSession,
    request_id: UUID,
    new_status: str,
    reviewer_id: UUID,
    reviewer_name: str,
    reason: Optional[str] = None,
    user_role: str = "PROCUREMENT"
) -> Optional[AssetRequestResponse]:
    """
    Procurement-only: validate PO (set PO_VALIDATED) or reject (set PROCUREMENT_REJECTED).
    Finance approve/reject is handled by procurement_service.validate_finance_budget.
    """
    result = await db.execute(
        select(AssetRequest).options(joinedload(AssetRequest.requester)).filter(AssetRequest.id == request_id)
    )
    db_request = result.scalars().first()
    if not db_request:
        return None
    
    if db_request.status == "PO_VALIDATED" and new_status == "PROCUREMENT_APPROVED":
        return await _populate_requester_info(db, db_request, user_role=user_role)

    is_valid, error_msg = validate_state_transition(
        current_status=db_request.status,
        new_status=new_status,
        user_role=user_role,
        asset_ownership_type=db_request.asset_ownership_type
    )
    
    if not is_valid:
        raise ValueError(error_msg)
    
    po_query = select(PurchaseOrder).filter(PurchaseOrder.asset_request_id == request_id).order_by(desc(PurchaseOrder.created_at))
    po_result = await db.execute(po_query)
    po = po_result.scalars().first()

    # Procurement validated PO -> hand off to Finance (PO_VALIDATED). Do not call validate_finance_budget here.
    if new_status == "PROCUREMENT_APPROVED":
        db_request.status = "PO_VALIDATED"
        db_request.procurement_finance_status = "PO_VALIDATED"
    elif new_status == "PROCUREMENT_REJECTED":
        db_request.status = "PROCUREMENT_REJECTED"
        db_request.procurement_finance_status = "REJECTED"
    db_request.procurement_finance_reviewed_by = reviewer_id
    db_request.procurement_finance_reviewed_at = datetime.now()
    if reason:
        db_request.procurement_finance_rejection_reason = reason
    
    if db_request.manager_approvals is None:
        db_request.manager_approvals = []
    db_request.manager_approvals.append({
        "reviewer_id": str(reviewer_id),
        "reviewer_name": reviewer_name,
        "decision": new_status,
        "reason": reason,
        "timestamp": datetime.now().isoformat(),
        "type": "PROCUREMENT_REVIEW"
    })
    
    sync_request_state(db_request)
    log = ProcurementLog(
        id=uuid.uuid4(),
        reference_id=request_id,
        action="PO_VALIDATED" if new_status == "PROCUREMENT_APPROVED" else "PO_REJECTED",
        performed_by=str(reviewer_id), # Cast to string for String column
        role=user_role,
        metadata_={"reviewer_name": reviewer_name, "decision": new_status, "reason": reason}
    )
    db.add(log)
    
    await db.commit()
    await db.refresh(db_request)
    return await _populate_requester_info(db, db_request, user_role=user_role)


async def perform_qc_check(
    db: AsyncSession,
    request_id: UUID,
    qc_status: str,
    performer_id: UUID,
    performer_name: str,
    qc_notes: Optional[str] = None
) -> Optional[AssetRequestResponse]:
    """
    Perform quality check on received asset
    """
    result = await db.execute(
        select(AssetRequest).options(joinedload(AssetRequest.requester)).filter(AssetRequest.id == request_id)
    )
    db_request = result.scalars().first()
    if not db_request:
        return None
    
    if db_request.status != "QC_PENDING":
        raise ValueError(f"QC can only be performed when status is QC_PENDING. Current status: {db_request.status}")
    
    if qc_status not in ["PASSED", "FAILED"]:
        raise ValueError("qc_status must be PASSED or FAILED")
    
    db_request.qc_status = qc_status
    db_request.qc_performed_by = performer_id
    db_request.qc_performed_at = datetime.now()
    db_request.qc_notes = qc_notes
    
    if qc_status == "PASSED":
        db_request.status = "USER_ACCEPTANCE_PENDING"
    else:
        db_request.status = "QC_FAILED"
    
    sync_request_state(db_request)
    if db_request.manager_approvals is None:
        db_request.manager_approvals = []
    db_request.manager_approvals.append({
        "reviewer_id": str(performer_id),
        "reviewer_name": performer_name,
        "decision": qc_status,
        "reason": qc_notes,
        "timestamp": datetime.now().isoformat(),
        "type": "QC_CHECK"
    })
    
    await db.commit()
    await db.refresh(db_request)
    if qc_status == "FAILED":
        await NotificationService(db).notify_qc_failed(request_id)
    return await _populate_requester_info(db, db_request)


async def update_user_acceptance(
    db: AsyncSession,
    request_id: UUID,
    user_id: UUID,
    acceptance_status: str
) -> Optional[AssetRequestResponse]:
    """
    Update user acceptance status
    """
    result = await db.execute(
        select(AssetRequest).options(joinedload(AssetRequest.requester)).filter(AssetRequest.id == request_id)
    )
    db_request = result.scalars().first()
    if not db_request:
        return None
    
    if db_request.requester_id != user_id:
        raise ValueError("Only the requester can accept/reject the asset")
    
    if db_request.status != "USER_ACCEPTANCE_PENDING":
        raise ValueError(f"User acceptance can only be performed when status is USER_ACCEPTANCE_PENDING. Current status: {db_request.status}")
    
    if acceptance_status not in ["ACCEPTED", "REJECTED"]:
        raise ValueError("acceptance_status must be ACCEPTED or REJECTED")
    
    db_request.user_acceptance_status = acceptance_status
    db_request.user_accepted_at = datetime.now()
    
    if acceptance_status == "ACCEPTED":
        # Root Fix: If this is an inventory-allocated asset (Asset ID present), 
        # auto-fulfill it to IN_USE to avoid redundant manager approval.
        if db_request.asset_id:
            db_request.status = "IN_USE"
            sync_request_state(db_request)
            from .asset_service import finalize_asset_assignment
            await finalize_asset_assignment(
                db=db,
                asset_id=db_request.asset_id,
                requester_id=user_id,
                manager_id=user_id, # User self-confirms receipt
                manager_name="System/End-User (Auto-Fulfill)"
            )
            print(f"[AUTO-FULFILL] Request {request_id} fulfilled directly upon user acceptance")
        else:
            # New procurement/BYOD path follows official confirmation
            db_request.status = "MANAGER_CONFIRMED_ASSIGNMENT"
    else:
        db_request.status = "USER_REJECTED"
    
    if db_request.manager_approvals is None:
        db_request.manager_approvals = []
    db_request.manager_approvals.append({
        "reviewer_id": str(user_id),
        "reviewer_name": "END_USER",
        "decision": acceptance_status,
        "timestamp": datetime.now().isoformat(),
        "type": "USER_ACCEPTANCE",
        "auto_fulfilled": True if (acceptance_status == "ACCEPTED" and db_request.asset_id) else False
    })
    
    sync_request_state(db_request)
    await db.commit()
    await db.refresh(db_request)
    return await _populate_requester_info(db, db_request)


async def register_byod_device_service(
    db: AsyncSession,
    request_id: UUID,
    reviewer_id: UUID,
    reviewer_name: str,
    device_model: str,
    os_version: str,
    serial_number: str
) -> Optional[AssetRequestResponse]:
    """
    Service to register a BYOD device and update request status.
    """
    result = await db.execute(
        select(AssetRequest).options(joinedload(AssetRequest.requester)).filter(AssetRequest.id == request_id)
    )
    db_request = result.scalars().first()
    # Accept both IT_APPROVED (quick path) and BYOD_COMPLIANCE_CHECK (full compliance flow)
    if not db_request or db_request.status not in ("IT_APPROVED", "BYOD_COMPLIANCE_CHECK"):
        return None

    # 1. Create BYOD entry
    from ..models.models import ByodDevice
    byod = ByodDevice(
        id=uuid.uuid4(),
        request_id=db_request.id,
        owner_id=db_request.requester_id,
        device_model=device_model,
        os_version=os_version,
        serial_number=serial_number,
        compliance_status="COMPLIANT",
    )
    db.add(byod)
    
    # 2. Update status: IT_APPROVED → IN_USE (quick path); BYOD_COMPLIANCE_CHECK → keep for compliance check
    if db_request.status == "IT_APPROVED":
        db_request.status = "IN_USE"
    db_request.updated_at = datetime.now()
    
    # 3. Add to approvals log
    if db_request.manager_approvals is None:
        db_request.manager_approvals = []
    db_request.manager_approvals.append({
        "reviewer_id": str(reviewer_id),
        "reviewer_name": reviewer_name,
        "decision": "IN_USE",
        "timestamp": datetime.now().isoformat(),
        "type": "BYOD_REGISTRATION"
    })
    
    sync_request_state(db_request)
    await db.commit()
    await db.refresh(db_request)
    return await _populate_requester_info(db, db_request)


async def get_all_asset_requests(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    requester_id: Optional[UUID] = None,
    domain: Optional[str] = None,
    department: Optional[str] = None,
    user_role: Optional[str] = None
) -> List[AssetRequestResponse]:
    """
    Get all asset requests with optional filtering
    """
    print(f"DEBUG: Filtering requests - status={status}, requester_id={requester_id}, domain={domain}, department={department}")
    
    query = select(AssetRequest)
    if status:
        query = query.filter(AssetRequest.status == status)
    
    # Unified Scoping: Combine filters safely to allow "Dept OR Domain OR Mine"
    from sqlalchemy import or_
    filters = []
    
    if requester_id:
        filters.append(AssetRequest.requester_id == requester_id)
        
    if department:
        # Resolve users in this department or domain
        query = query.join(User, AssetRequest.requester_id == User.id)
        filters.append(
            or_(
                User.department.ilike(f"%{department}%"),
                User.domain.ilike(f"%{department}%")
            )
        )
    elif domain:
        # Fallback for domain-only filtering if department not provided
        query = query.join(User, AssetRequest.requester_id == User.id)
        filters.append(User.domain == domain)
        
    if filters:
        query = query.filter(or_(*filters))
    
    # Eager load requester for the entire list
    query = query.options(joinedload(AssetRequest.requester))
    
    # Order by newest first so pending requests appear at top
    query = query.order_by(desc(AssetRequest.created_at))
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    results = result.unique().scalars().all()
    
    response_list = []
    for req in results:
        res = await _populate_requester_info(db, req, user_role=user_role)
        response_list.append(res)
        
    return response_list


async def apply_root_fix(db: AsyncSession) -> dict:
    """
    1. Sync current_owner_role and procurement_stage for ALL requests.
    2. Sync Asset.assigned_to / assigned_to_id for applicable requests.
    Returns {"updated": count, "errors": list}.
    """
    updated = 0
    errors = []
    
    # 1. Sync ALL requests state
    all_reqs_result = await db.execute(select(AssetRequest))
    all_reqs = all_reqs_result.scalars().all()
    for req in all_reqs:
        sync_request_state(req)
        updated += 1
        
    # 2. Sync Asset links (Existing logic)
    q = select(AssetRequest).filter(
        AssetRequest.asset_id.isnot(None),
        AssetRequest.status.in_([
            "USER_ACCEPTANCE_PENDING",
            "MANAGER_CONFIRMED_ASSIGNMENT",
            "FULFILLED",
            "IN_USE",
        ]),
    )
    result = await db.execute(q)
    requests = result.scalars().all()

    for req in requests:
        try:
            u_result = await db.execute(select(User).filter(User.id == req.requester_id))
            user = u_result.scalars().first()
            if not user:
                continue
            a_result = await db.execute(select(Asset).filter(Asset.id == req.asset_id))
            asset = a_result.scalars().first()
            if not asset:
                continue
            asset.assigned_to = user.full_name
            asset.assigned_to_id = user.id
            
            if req.status in ("FULFILLED", "IN_USE"):
                asset.status = "In Use"
            else:
                asset.status = "Reserved"
        except Exception as e:
            errors.append(str(e))

    await db.commit()
    return {"updated": updated, "errors": errors}
