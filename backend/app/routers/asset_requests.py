"""
Asset Request endpoints for manager approvals (Asynchronous)
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from ..database.database import get_db
from ..schemas.asset_request_schema import (
    AssetRequestCreate,
    AssetRequestResponse,
    ManagerApprovalRequest,
    ManagerRejectionRequest,
    ByodRegisterRequest,
    ProcurementApprovalRequest,
    ProcurementRejectionRequest,
    QCPerformRequest,
    UserAcceptanceRequest,
    ITApprovalRequest,
    ITRejectionRequest,
    ManagerConfirmationRequest,
    ByodComplianceCheckRequest,
    MdmEnrollmentRequest,
    DeliveryConfirmationRequest,
)
from ..services import asset_request_service, procurement_service
from ..services.notification_service import send_notification
from ..utils.auth_utils import get_current_user
from ..schemas.user_schema import UserResponse
from ..models.models import ByodDevice, Asset, AssetAssignment, PurchaseRequest, User, PurchaseOrder, AssetInventory
from ..services import asset_service
from ..schemas.asset_schema import AssetCreate
import uuid as _uuid
from uuid import UUID
from datetime import datetime, date

router = APIRouter(
    prefix="/asset-requests",
    tags=["asset-requests"]
)

@router.get("", response_model=List[AssetRequestResponse])
async def get_asset_requests(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    mine: bool = False,
    domain: Optional[str] = None,
    department: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get all asset requests (Asynchronous).
    """
    effective_requester_id = None
    if mine:
        effective_requester_id = current_user.id
    elif current_user.role == "END_USER" and current_user.position != "MANAGER":
        # Force personal view for regular end users if no domain/other filter is allowed
        effective_requester_id = current_user.id
    
    # Root Fix: Reinforce department scoping for managers, BUT exempt global roles
    # IT_MANAGEMENT, ASSET_MANAGER, FINANCE need to see requests from ALL departments
    exclude_roles = ["ADMIN", "SYSTEM_ADMIN", "IT_MANAGEMENT", "ASSET_MANAGER", "FINANCE", "PROCUREMENT"]
    
    # CRITICAL: Check role FIRST before checking position
    # IT managers have position=MANAGER but role=IT_MANAGEMENT, they should see ALL requests
    if current_user.role not in exclude_roles and current_user.position == "MANAGER":
        if not department:
            department = current_user.department or current_user.domain
        
    return await asset_request_service.get_all_asset_requests(
        db, 
        skip=skip, 
        limit=limit, 
        status=status, 
        requester_id=effective_requester_id, 
        domain=domain,
        department=department,
        user_role=current_user.role
    )


@router.get("/{request_id}", response_model=AssetRequestResponse)
async def get_asset_request_by_id(
    request_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get a single asset request by ID (Asynchronous).
    """
    asset_request = await asset_request_service.get_asset_request_by_id(db, request_id, user_role=current_user.role)
    if not asset_request:
        raise HTTPException(status_code=404, detail="Asset request not found")
        
    # Security Root Fix: Authorization check
    if current_user.role == "END_USER" and current_user.position != "MANAGER":
        if asset_request.requester_id != current_user.id:
            raise HTTPException(status_code=403, detail="Unauthorized to view this request")
            
    return asset_request


async def verify_active_end_user(
    requester_id: UUID,
    db: AsyncSession
):
    """
    Verify that the user is an ACTIVE END_USER (Asynchronous).
    """
    user = await asset_request_service.get_user_by_id_db(db, requester_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role != "END_USER":
        raise HTTPException(status_code=403, detail="Only END_USER can create requests")
    if user.status != "ACTIVE":
        raise HTTPException(status_code=403, detail="User account is not active")
    
    return user

@router.post("", response_model=AssetRequestResponse, status_code=201)
async def create_asset_request(
    request: AssetRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Create a new asset request (Asynchronous).
    """
    # Security: Derive requester_id from JWT
    requester_id = current_user.id
    
    await verify_active_end_user(requester_id, db)
    
    return await asset_request_service.create_asset_request_v2(db, request, requester_id, initial_status="SUBMITTED")


async def verify_manager_authorization(
    manager_id: UUID,
    db: AsyncSession
):
    """
    Verify that the user is a valid manager (Asynchronous).
    """
    manager = await asset_request_service.get_user_by_id_db(db, manager_id)
    if not manager:
        raise HTTPException(status_code=404, detail="Manager not found")
    if manager.role != "END_USER" or manager.position != "MANAGER":
        raise HTTPException(status_code=403, detail="Only managers can approve/reject")
    if manager.status != "ACTIVE":
        raise HTTPException(status_code=403, detail="Manager account is not active")
    return manager


@router.post("/{request_id}/manager/approve", response_model=AssetRequestResponse)
async def approve_asset_request(
    request_id: UUID,
    approval: ManagerApprovalRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Approve an asset request (Asynchronous).
    """
    manager = await verify_manager_authorization(current_user.id, db)
    db_request = await asset_request_service.get_asset_request_by_id_db(db, request_id)
    if not db_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if db_request.status != "SUBMITTED":
        raise HTTPException(status_code=403, detail="Already processed")
    
    requester = await asset_request_service.get_user_by_id_db(db, db_request.requester_id)
    if not requester:
        raise HTTPException(status_code=404, detail="Requester not found")
    
    # Verify domain match
    if not (manager.department == requester.department or manager.domain == requester.domain):
        raise HTTPException(status_code=403, detail="Manager/Requester domain mismatch")
    
    return await asset_request_service.update_asset_request_status_with_validation(
        db, request_id, "MANAGER_APPROVED", current_user.role, current_user.id, current_user.full_name, decision="APPROVED"
    )

@router.post("/{request_id}/manager/reject", response_model=AssetRequestResponse)
async def reject_asset_request(
    request_id: UUID,
    rejection: ManagerRejectionRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Reject an asset request (Asynchronous).
    """
    manager = await verify_manager_authorization(current_user.id, db)
    db_request = await asset_request_service.get_asset_request_by_id_db(db, request_id)
    if not db_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if db_request.status != "SUBMITTED":
        raise HTTPException(status_code=403, detail="Already processed")
    
    requester = await asset_request_service.get_user_by_id_db(db, db_request.requester_id)
    if not (manager.department == requester.department or manager.domain == requester.domain):
        raise HTTPException(status_code=403, detail="Mismatch")
    
    res = await asset_request_service.update_asset_request_status_with_validation(
        db, request_id, "MANAGER_REJECTED", current_user.role, current_user.id, current_user.full_name, reason=rejection.reason
    )
    if res:
        await send_notification(db, request_id, "status_change", old_status="SUBMITTED", new_status="MANAGER_REJECTED", reviewer_name=current_user.full_name, reason=rejection.reason)
    return res

# Backward compatibility aliases
@router.post("/{id}/manager/approve-v2", response_model=AssetRequestResponse)
async def manager_approve_request_v2(
    id: UUID, 
    approval: ManagerApprovalRequest, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return await approve_asset_request(id, approval, db, current_user=current_user)

@router.post("/{id}/manager/reject-v2", response_model=AssetRequestResponse)
async def manager_reject_request_v2(
    id: UUID, 
    rejection: ManagerRejectionRequest, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return await reject_asset_request(id, rejection, db, current_user=current_user)

# ---------------- IT APPROVAL ROUTES ----------------

async def verify_it_management(user_id: UUID, db: AsyncSession) -> User:
    user = await asset_request_service.get_user_by_id_db(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.role != "IT_MANAGEMENT":
        raise HTTPException(status_code=403, detail="Not IT_MANAGEMENT")
    if user.status != "ACTIVE":
        raise HTTPException(status_code=403, detail="Not active")
    return user


@router.post("/{request_id}/it/approve", response_model=AssetRequestResponse)
async def it_approve_request(
    request_id: UUID,
    approval: ITApprovalRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    reviewer = current_user
    if reviewer.role != "IT_MANAGEMENT" and reviewer.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not IT_MANAGEMENT")
        
    try:
        res = await asset_request_service.update_it_review_status(
            db, request_id, "IT_APPROVED", reviewer.id, reviewer.full_name, "IT_APPROVED"
        )
        if not res:
            print(f"[IT_APPROVE] Request {request_id} not found or update failed")
            raise HTTPException(status_code=404, detail="Asset request not found")
        print(f"[IT_APPROVE] Successfully approved request {request_id}")
        return res
    except HTTPException:
        # Re-raise HTTPException as-is (don't wrap it)
        raise
    except ValueError as e:
        # Handle state transition validation errors
        print(f"[IT_APPROVE] State validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Handle any other unexpected errors
        import traceback
        print(f"[IT_APPROVE] Unexpected error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/{request_id}/it/reject", response_model=AssetRequestResponse)
async def it_reject_request(
    request_id: UUID,
    rejection: ITRejectionRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    reviewer = current_user
    if reviewer.role != "IT_MANAGEMENT" and reviewer.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not IT_MANAGEMENT")
    try:
        res = await asset_request_service.update_it_review_status(
            db, request_id, "IT_REJECTED", reviewer.id, reviewer.full_name, "IT_REJECTED", reason=rejection.reason
        )
        if not res:
            raise HTTPException(status_code=404, detail="Asset request not found")
        await send_notification(db, request_id, "status_change", old_status="MANAGER_APPROVED", new_status="IT_REJECTED", reviewer_name=reviewer.full_name, reason=rejection.reason)
        return res
    except HTTPException:
        # Re-raise HTTPException as-is (don't wrap it)
        raise
    except ValueError as e:
        # Handle state transition validation errors
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Handle any other unexpected errors
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# ---------------- BYOD REGISTRATION ROUTE ----------------

@router.post("/{id}/byod/register", response_model=AssetRequestResponse)
async def byod_register_device(
    id: UUID,
    payload: ByodRegisterRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    reviewer = current_user
    if reviewer.role != "IT_MANAGEMENT" and reviewer.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
    res = await asset_request_service.register_byod_device_service(
        db, id, reviewer.id, reviewer.full_name, payload.device_model, payload.os_version, payload.serial_number
    )
    if not res:
        raise HTTPException(status_code=403, detail="Invalid request state for BYOD")
    return res


# ---------------- COMPANY-OWNED FULFILLMENT ROUTE ----------------

async def verify_asset_inventory_manager(user_id: UUID, db: AsyncSession) -> User:
    user = await asset_request_service.get_user_by_id_db(db, user_id)
    if not user or user.role not in ["ASSET_INVENTORY_MANAGER", "ASSET_MANAGER"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    return user


@router.post("/{id}/company-owned/fulfill", response_model=AssetRequestResponse)
async def fulfill_company_owned_request(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    reviewer = await verify_asset_inventory_manager(current_user.id, db)
    db_request = await asset_request_service.get_asset_request_by_id_db(db, id)
    if not db_request or db_request.status != "IT_APPROVED":
        raise HTTPException(status_code=403, detail="Not IT_APPROVED")

    # Try inventory
    res_asset = await db.execute(select(Asset).filter(
        Asset.type == db_request.asset_type,
        Asset.status == "In Stock"
    ))
    candidate_asset = res_asset.scalars().first()

    if candidate_asset:
        await asset_service.assign_asset(db, candidate_asset.id, db_request.requester_id, candidate_asset.location, date.today())
        db_request.status = "IN_USE"
        db_request.asset_id = candidate_asset.id
        await db.commit()
        return await asset_request_service._populate_requester_info(db, db_request)

    # Procurement fallback
    db_request.status = "PROCUREMENT_REQUESTED"
    pr = PurchaseRequest(
        id=_uuid.uuid4(),
        asset_request_id=db_request.id,
        requester_id=db_request.requester_id,
        asset_name=db_request.asset_name,
        status="Requested"
    )
    db.add(pr)
    await db.commit()
    return await asset_request_service._populate_requester_info(db, db_request)


# ---------------- PROCUREMENT and FINANCE (separate roles) ----------------

async def verify_procurement_or_finance(user_id: UUID, db: AsyncSession) -> User:
    """Allow only PROCUREMENT or FINANCE (no combined role)."""
    user = await asset_request_service.get_user_by_id_db(db, user_id)
    if not user or user.role not in ["PROCUREMENT", "FINANCE"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    return user

@router.post("/{id}/procurement/approve", response_model=AssetRequestResponse)
async def procurement_approve_request(
    id: UUID, 
    approval: ProcurementApprovalRequest, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    reviewer = current_user
    if reviewer.role not in ["PROCUREMENT", "ADMIN", "SYSTEM_ADMIN"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    try:
        res = await asset_request_service.update_procurement_finance_status(db, id, "PROCUREMENT_APPROVED", reviewer.id, reviewer.full_name, user_role="PROCUREMENT")
        if not res:
            raise HTTPException(status_code=404, detail="Asset request not found")
        return res
    except Exception as e:
        import traceback
        with open("d:/ASSET-MANAGER/debug_errors.log", "a") as f:
            f.write(f"\n--- PROCUREMENT ERROR ---\n{str(e)}\n")
            traceback.print_exc(file=f)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{id}/procurement/reject", response_model=AssetRequestResponse)
async def procurement_reject_request(
    id: UUID, 
    rejection: ProcurementRejectionRequest, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role not in ["PROCUREMENT", "ADMIN", "SYSTEM_ADMIN"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    res = await asset_request_service.update_procurement_finance_status(db, id, "PROCUREMENT_REJECTED", current_user.id, current_user.full_name, reason=rejection.reason, user_role="PROCUREMENT")
    if not res:
        raise HTTPException(status_code=404, detail="Asset request not found")
    await send_notification(db, id, "status_change", old_status="PO_UPLOADED", new_status="PROCUREMENT_REJECTED", reviewer_name=current_user.full_name, reason=rejection.reason)
    return res

@router.post("/{id}/finance/approve", response_model=AssetRequestResponse)
async def finance_approve_request(
    id: UUID, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role not in ["FINANCE", "ADMIN", "SYSTEM_ADMIN"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    try:
        from sqlalchemy import desc
        from ..models.models import PurchaseOrder
        db_request = await asset_request_service.get_asset_request_by_id_db(db, id)
        if not db_request:
            raise HTTPException(status_code=404, detail="Asset request not found")
        po_result = await db.execute(select(PurchaseOrder).filter(PurchaseOrder.asset_request_id == id).order_by(desc(PurchaseOrder.created_at)))
        po = po_result.scalars().first()
        if not po:
            raise HTTPException(status_code=400, detail="No Purchase Order found for this request. Procurement must upload and validate PO first.")
        await procurement_service.validate_finance_budget(db, po.id, current_user.id, "APPROVE")
        await db.commit()
        await db.refresh(db_request)
        return await asset_request_service._populate_requester_info(db, db_request, user_role="FINANCE")
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        with open("d:/ASSET-MANAGER/debug_errors.log", "a") as f:
            f.write(f"\n--- FINANCE ERROR ---\n{str(e)}\n")
            traceback.print_exc(file=f)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{id}/finance/reject", response_model=AssetRequestResponse)
async def finance_reject_request(
    id: UUID, 
    rejection: ProcurementRejectionRequest, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role not in ["FINANCE", "ADMIN", "SYSTEM_ADMIN"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    from sqlalchemy import desc
    from ..models.models import PurchaseOrder
    db_request = await asset_request_service.get_asset_request_by_id_db(db, id)
    if not db_request:
        raise HTTPException(status_code=404, detail="Asset request not found")
    po_result = await db.execute(select(PurchaseOrder).filter(PurchaseOrder.asset_request_id == id).order_by(desc(PurchaseOrder.created_at)))
    po = po_result.scalars().first()
    if not po:
        raise HTTPException(status_code=400, detail="No Purchase Order found for this request.")
    await procurement_service.validate_finance_budget(db, po.id, current_user.id, "REJECT", reason=rejection.reason)
    await db.commit()
    await db.refresh(db_request)
    await send_notification(db, id, "status_change", old_status="PO_VALIDATED", new_status="FINANCE_REJECTED", reviewer_name=current_user.full_name, reason=rejection.reason)
    return await asset_request_service._populate_requester_info(db, db_request, user_role="FINANCE")

@router.post("/{id}/procurement/confirm-delivery", response_model=AssetRequestResponse)
async def procurement_confirm_delivery(
    id: UUID, 
    delivery_info: DeliveryConfirmationRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    if current_user.role not in ["PROCUREMENT", "ADMIN", "SYSTEM_ADMIN"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    db_request = await asset_request_service.get_asset_request_by_id_db(db, id)
    if not db_request:
        raise HTTPException(status_code=404, detail="Asset request not found")
        
    # ROOT FIX: Prevent duplicate asset creation if already confirmed
    if db_request.asset_id:
        return await asset_request_service._populate_requester_info(db, db_request)

    db_request.status = "QC_PENDING"
    db_request.updated_at = datetime.now()
    db_request.procurement_finance_status = "DELIVERED"
    
    # Automated Asset Onboarding
    po_result = await db.execute(select(PurchaseOrder).filter(PurchaseOrder.asset_request_id == id))
    po = po_result.scalars().first()
    
    # Ensure vendor is NEVER null (Non-nullable in Asset model)
    vendor_name = delivery_info.asset_name if not delivery_info.serial_number else "Commercial"
    if db_request.asset_vendor:
        vendor_name = db_request.asset_vendor
    elif po and po.vendor_name:
        vendor_name = po.vendor_name

    try:
        # Pre-populate assignment info for immediate visibility
        from ..services.asset_service import get_user_by_id_db
        requester = await get_user_by_id_db(db, db_request.requester_id)
        
        new_asset = Asset(
            id=_uuid.uuid4(),
            name=delivery_info.asset_name,
            type=db_request.asset_type,
            model=delivery_info.asset_model or db_request.asset_model or "Standard",
            vendor=vendor_name,
            serial_number=delivery_info.serial_number,
            status="Reserved", # Move to Reserved immediately for user acceptance
            location="IT Warehouse",
            cost=po.total_cost if po else (db_request.cost_estimate or 0.0),
            segment="IT",
            assigned_to=requester.full_name if requester else "Employee",
            assigned_to_id=db_request.requester_id,
            request_id=id
        )
        db.add(new_asset)
        db_request.asset_id = new_asset.id
        
        # Also add to asset.asset_inventory for the stock dashboard
        inventory_item = AssetInventory(
            id=_uuid.uuid4(),
            asset_id=new_asset.id,
            location=new_asset.location,
            status="Available"
        )
        db.add(inventory_item)
        
        await db.commit()
    except Exception as e:
        await db.rollback()
        if "unique constraint" in str(e).lower() and "serial_number" in str(e).lower():
            raise HTTPException(status_code=400, detail=f"Serial number {delivery_info.serial_number} is already registered in the system.")
        raise HTTPException(status_code=500, detail=f"Failed to register asset: {str(e)}")

    return await asset_request_service._populate_requester_info(db, db_request)

# ---------------- QC & USER ACCEPTANCE ----------------

@router.post("/{id}/qc/perform", response_model=AssetRequestResponse)
async def perform_qc(
    id: UUID, 
    qc_request: QCPerformRequest, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    reviewer = await verify_asset_inventory_manager(current_user.id, db)
    res = await asset_request_service.perform_qc_check(db, id, qc_request.qc_status, reviewer.id, reviewer.full_name, qc_request.qc_notes)
    if not res:
        raise HTTPException(status_code=404, detail="Asset request not found")
    return res

@router.post("/{id}/user/accept", response_model=AssetRequestResponse)
async def user_accept_asset(
    id: UUID, 
    acceptance: UserAcceptanceRequest, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Verify current_user is the requester
    db_request = await asset_request_service.get_asset_request_by_id_db(db, id)
    if not db_request or db_request.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    res = await asset_request_service.update_user_acceptance(db, id, current_user.id, "ACCEPTED")
    if not res:
        raise HTTPException(status_code=404, detail="Asset request not found")
    return res

@router.post("/{request_id}/inventory/allocate", response_model=AssetRequestResponse)
async def inventory_allocate_asset(
    request_id: UUID, 
    asset_id: UUID, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    await verify_asset_inventory_manager(current_user.id, db)
    db_request = await asset_request_service.get_asset_request_by_id_db(db, request_id)
    if not db_request:
        raise HTTPException(status_code=404, detail="Asset request not found")
    asset_res = await db.execute(select(Asset).filter(Asset.id == asset_id))
    asset = asset_res.scalars().first()
    if asset:
        user = await asset_request_service.get_user_by_id_db(db, db_request.requester_id)
        # Root fix: keep asset.assigned_to / assigned_to_id in sync with request requester
        asset.assigned_to = user.full_name if user else "Employee"
        asset.assigned_to_id = db_request.requester_id
        asset.status = "Reserved"  # User acceptance pending; finalize_asset_assignment sets "In Use" on accept
        db_request.status = "USER_ACCEPTANCE_PENDING"
        db_request.asset_id = asset_id
        await db.commit()
    return await asset_request_service._populate_requester_info(db, db_request)


@router.post("/{request_id}/inventory/not-available", response_model=AssetRequestResponse)
async def inventory_mark_not_available(
    request_id: UUID, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    await verify_asset_inventory_manager(current_user.id, db)
    db_request = await asset_request_service.get_asset_request_by_id_db(db, request_id)
    if not db_request:
        raise HTTPException(status_code=404, detail="Asset request not found")
    db_request.status = "PROCUREMENT_REQUESTED"
    await db.commit()
    return await asset_request_service._populate_requester_info(db, db_request)


# ========== MANAGER CONFIRMATION ENDPOINTS (Phase 5) ==========

@router.post("/{request_id}/manager/confirm-it", response_model=AssetRequestResponse)
async def manager_confirm_it_approval(
    request_id: UUID,
    confirmation: ManagerConfirmationRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Manager confirms IT approval decision.
    This triggers auto-routing logic (inventory check or procurement).
    """
    from ..services.manager_confirmation_service import manager_confirm_stage
    
    # Verify manager authorization
    manager = await verify_manager_authorization(current_user.id, db)
    
    result = await manager_confirm_stage(
        db=db,
        request_id=request_id,
        stage="IT_APPROVAL",
        manager_id=manager.id,
        manager_name=manager.full_name,
        decision=confirmation.decision,
        reason=confirmation.reason
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Request not found")
    
    return result


@router.post("/{request_id}/manager/confirm-budget", response_model=AssetRequestResponse)
async def manager_confirm_budget_approval(
    request_id: UUID,
    confirmation: ManagerConfirmationRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Manager confirms Finance budget approval.
    Routes to QC_PENDING after confirmation.
    """
    from ..services.manager_confirmation_service import manager_confirm_stage
    
    # Verify manager authorization
    manager = await verify_manager_authorization(current_user.id, db)
    
    result = await manager_confirm_stage(
        db=db,
        request_id=request_id,
        stage="BUDGET_APPROVAL",
        manager_id=manager.id,
        manager_name=manager.full_name,
        decision=confirmation.decision,
        reason=confirmation.reason
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Request not found")
    
    return result


@router.post("/{request_id}/manager/confirm-assignment", response_model=AssetRequestResponse)
async def manager_confirm_final_assignment(
    request_id: UUID,
    confirmation: ManagerConfirmationRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Manager confirms final asset assignment.
    Transitions request to IN_USE status.
    """
    from ..services.manager_confirmation_service import manager_confirm_stage
    
    # Verify manager authorization
    manager = await verify_manager_authorization(current_user.id, db)
    
    result = await manager_confirm_stage(
        db=db,
        request_id=request_id,
        stage="ASSIGNMENT",
        manager_id=manager.id,
        manager_name=manager.full_name,
        decision=confirmation.decision,
        reason=confirmation.reason
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Request not found")
    
    return result


# ========== BYOD / MDM ENDPOINTS ==========

@router.post("/{request_id}/byod-compliance-check")
async def check_byod_compliance(
    request_id: UUID,
    check_request: ByodComplianceCheckRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Validate BYOD device compliance and MDM enrollment.
    Automatically transitions to IN_USE or BYOD_REJECTED based on compliance status.
    Use dry_run=true to test connectivity without executing backend logic.
    """
    # Dry run: return mock success, no DB changes
    if check_request.dry_run:
        return {
            "success": True,
            "request_id": str(request_id),
            "final_status": "DRY_RUN",
            "dry_run": True,
            "message": "Dry run - no backend logic executed",
        }

    from ..services.mdm_service import validate_byod_compliance

    # Verify IT management authorization
    reviewer = current_user
    if reviewer.role != "IT_MANAGEMENT" and reviewer.role != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Only IT Management can perform BYOD compliance checks"
        )

    try:
        result = await validate_byod_compliance(
            db=db,
            request_id=request_id,
            reviewer_id=reviewer.id
        )
        
        if not result["success"]:
            raise HTTPException(
                status_code=400,
                detail=result.get("error", "BYOD compliance check failed")
            )
        
        return result
    except Exception as e:
        import traceback
        with open("d:/ASSET-MANAGER/debug_errors.log", "a") as f:
             f.write(f"\n--- BYOD CHECK ERROR ---\n{str(e)}\n")
             traceback.print_exc(file=f)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/byod-devices/{device_id}/mdm-enroll")
async def enroll_device_in_mdm(
    device_id: UUID,
    enrollment_request: MdmEnrollmentRequest,
    db: AsyncSession = Depends(get_db),
    it_user = Depends(get_current_user)
):
    """
    Manually trigger MDM enrollment for a BYOD device.
    Returns enrollment status, compliance checks, and applied security policies.
    """
    if it_user.role not in ["IT_MANAGEMENT", "ADMIN"]:
        raise HTTPException(status_code=403, detail="Unauthorized")
    from ..services.mdm_service import simulate_mdm_enrollment
    
    result = await simulate_mdm_enrollment(
        db=db,
        device_id=enrollment_request.device_id,
        security_policies=enrollment_request.security_policies
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=400,
            detail=result.get("error", "MDM enrollment failed")
        )
    
    return result


@router.post("/apply-root-fix")
async def apply_root_fix_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Admin-only. Syncs Asset.assigned_to and assigned_to_id from AssetRequest requester
    for all requests with an asset in USER_ACCEPTANCE_PENDING, MANAGER_CONFIRMED_ASSIGNMENT,
    FULFILLED, or IN_USE. Use after data fixes or to repair orphaned asset links.
    """
    if current_user.role not in ["ADMIN", "SYSTEM_ADMIN", "ASSET_MANAGER"]:
        raise HTTPException(status_code=403, detail="Only Admin or Asset Manager can run root fix")
    result = await asset_request_service.apply_root_fix(db)
    return result
