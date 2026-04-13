"""
Workflows Engine Backend — handles renewal, procurement, and disposal workflows.
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, and_, func
from typing import Optional, List
from pydantic import BaseModel
from datetime import date, timedelta
from uuid import UUID

from ..database.database import get_db
from ..models.models import Asset, PurchaseOrder, User, AssetRequest, AuditLog, Department
from ..utils.auth_utils import get_current_user

router = APIRouter(
    prefix="/workflows",
    tags=["workflows"]
)

STAFF_ROLES = {"ADMIN", "IT_MANAGEMENT", "ASSET_MANAGER", "PROCUREMENT", "FINANCE", "MANAGER"}


class WorkflowAssetResponse(BaseModel):
    id: str
    name: str
    type: str
    status: str
    serial_number: Optional[str] = None
    warranty_expiry: Optional[str] = None
    cost: Optional[float] = None
    renewal_cost: Optional[float] = None
    renewal_urgency: Optional[str] = None
    requester_name: Optional[str] = None
    justification: Optional[str] = None
    business_justification: Optional[str] = None


class WorkflowAction(BaseModel):
    asset_id: UUID
    action: str  # APPROVE | REJECT | DEFER
    notes: Optional[str] = None


@router.get("/renewals", response_model=List[WorkflowAssetResponse])
async def get_renewal_workflow(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get assets due for renewal (warranty expiring in 90 days).
    Scoped to user department via Root Fix.
    """
    user_role = (current_user.role or "").strip().upper()
    if user_role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Unauthorized")

    user_dept_id = current_user.department_id
    today = date.today()
    ninety_days = today + timedelta(days=90)

    if user_role == "ADMIN":
        query = select(Asset).where(and_(Asset.warranty_expiry <= ninety_days, Asset.warranty_expiry >= today))
    else:
        # ROOT FIX: Scoping by department_id or unassigned
        query = (
            select(Asset)
            .outerjoin(User, Asset.assigned_to_id == User.id)
            .where(
                and_(
                    Asset.warranty_expiry <= ninety_days,
                    Asset.warranty_expiry >= today,
                    or_(
                        Asset.assigned_to_id == None,
                        User.department_id == user_dept_id if user_dept_id else False
                    )
                )
            )
        )

    result = await db.execute(query)
    assets = result.scalars().all()
    today = date.today()
    renewal_list = []
    for a in assets:
        urgency = a.renewal_urgency
        if a.warranty_expiry:
            days_left = (a.warranty_expiry - today).days
            if days_left <= 7: urgency = "Immediate"
            elif days_left <= 30: urgency = "High"
            elif days_left <= 60: urgency = "Medium"
            elif not urgency: urgency = "Low"
        
        display_name = a.name
        if "@" in display_name or ".com" in display_name:
            display_name = f"Node-{str(a.id)[:6].upper()}"

        display_type = a.type or "Unknown"
        if len(display_type) <= 1:
            display_type = "Infrastructure" if display_type == "i" else "General Asset"

        renewal_list.append(
            WorkflowAssetResponse(
                id=str(a.id),
                name=display_name,
                type=display_type,
                status=a.status,
                serial_number=a.serial_number,
                warranty_expiry=a.warranty_expiry.isoformat() if a.warranty_expiry else None,
                cost=a.cost,
                renewal_cost=a.cost if (a.cost and a.cost > 0) else 15000.0,
                renewal_urgency=urgency or "Low"
            )
        )
    return renewal_list


@router.get("/procurement", response_model=List[WorkflowAssetResponse])
async def get_procurement_workflow(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get pending procurement orders (Purchase Orders).
    Scoped to user department via Root Fix.
    """
    user_role = (current_user.role or "").strip().upper()
    if user_role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Unauthorized")

    user_dept_id = current_user.department_id

    if user_role == "ADMIN":
        query = select(PurchaseOrder).where(PurchaseOrder.status.in_(["UPLOADED", "PENDING"]))
    else:
        # ROOT FIX: Join via AssetRequest -> User and filter by department_id
        query = (
            select(PurchaseOrder)
            .join(AssetRequest, PurchaseOrder.asset_request_id == AssetRequest.id)
            .join(User, AssetRequest.requester_id == User.id)
            .where(
                and_(
                    PurchaseOrder.status.in_(["UPLOADED", "PENDING"]),
                    User.department_id == user_dept_id if user_dept_id else False
                )
            )
        )

    result = await db.execute(query)
    pos = result.scalars().all()
    return [
        WorkflowAssetResponse(
            id=str(po.id),
            name=f"PO: {po.vendor_name or 'Unspecified Vendor'}",
            type="Procurement",
            status=po.status,
            serial_number=None,
            warranty_expiry=None,
            cost=po.total_cost,
            renewal_cost=po.total_cost,
            renewal_urgency="N/A"
        )
        for po in pos
    ]


@router.get("/disposal", response_model=List[WorkflowAssetResponse])
async def get_disposal_workflow(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get assets pending disposal or retired.
    Scoped to user department via Root Fix.
    """
    user_role = (current_user.role or "").strip().upper()
    if user_role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Unauthorized")

    user_dept_id = current_user.department_id

    if user_role == "ADMIN":
        query = select(Asset).where(Asset.status.in_(["Retired", "Disposed"]))
    else:
        # ROOT FIX: Scoping by department_id or unassigned
        query = (
            select(Asset)
            .outerjoin(User, Asset.assigned_to_id == User.id)
            .where(
                and_(
                    Asset.status.in_(["Retired", "Disposed"]),
                    or_(
                        Asset.assigned_to_id == None,
                        User.department_id == user_dept_id if user_dept_id else False
                    )
                )
            )
        )

    result = await db.execute(query)
    assets = result.scalars().all()
    return [
        WorkflowAssetResponse(
            id=str(a.id),
            name=a.name,
            type=a.type or "Unknown",
            status=a.status,
            serial_number=a.serial_number,
            warranty_expiry=None,
            cost=a.cost,
            renewal_cost=0,
            renewal_urgency="Disposed"
        )
        for a in assets
    ]


@router.get("/approvals", response_model=List[WorkflowAssetResponse])
async def get_approvals_workflow(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Get pending asset requests awaiting manager approval.
    Scoped to user department via Root Fix.
    """
    user_role = (current_user.role or "").strip().upper()
    
    if user_role not in STAFF_ROLES and user_role != "MANAGER":
        raise HTTPException(status_code=403, detail="Unauthorized")

    user_dept_id = current_user.department_id

    # ROOT FIX: Filter by department_id
    query = select(AssetRequest).join(User, AssetRequest.requester_id == User.id).where(AssetRequest.status == "SUBMITTED")

    if user_role != "ADMIN":
        query = query.filter(
            User.department_id == user_dept_id if user_dept_id else False
        )

    result = await db.execute(query)
    requests = result.scalars().all()
    
    return [
        WorkflowAssetResponse(
            id=str(r.id),
            name=r.asset_name,
            type=r.asset_type,
            status=r.status,
            serial_number=None,
            warranty_expiry=None,
            cost=r.cost_estimate,
            renewal_cost=r.cost_estimate,
            renewal_urgency="Pending Approval",
            requester_name=r.requester.full_name if r.requester else "Unknown",
            justification=r.justification,
            business_justification=r.business_justification
        )
        for r in requests
    ]


@router.post("/action")
async def process_workflow_action(
    action: WorkflowAction,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Process a workflow action (Approve/Reject/Defer).
    Verifies authority and scope via Root Fix.
    """
    user_role = (current_user.role or "").strip().upper()
    if user_role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Unauthorized")

    user_dept_id = current_user.department_id

    # 1. Check Asset table
    result = await db.execute(select(Asset).where(Asset.id == action.asset_id))
    asset = result.scalars().first()
    
    if asset:
        if user_role != "ADMIN":
             # ROOT FIX: Verify user_dept_id for scoped authority
             scope_check = await db.execute(
                 select(User).where(and_(
                     User.id == asset.assigned_to_id, 
                     User.department_id == user_dept_id if user_dept_id else False
                 ))
             )
             if not scope_check.scalars().first():
                  raise HTTPException(status_code=404, detail="Asset not found or unauthorized")

        if action.action == "APPROVE":
            asset.status = "Active"
        elif action.action == "REJECT":
            asset.status = "Disposed"
        
        await db.commit()
        
        audit = AuditLog(
            entity_type="Asset",
            entity_id=str(action.asset_id),
            action=f"WORKFLOW_{action.action}",
            performed_by=current_user.id,
            details={"notes": action.notes, "new_status": asset.status}
        )
        db.add(audit)
        await db.commit()
        return {"status": "success", "message": f"Asset {action.asset_id} updated to {asset.status}"}

    # 2. Check PurchaseOrder
    result = await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == action.asset_id))
    po = result.scalars().first()
    if po:
        if user_role != "ADMIN":
            # ROOT FIX: Scoping via AssetRequest requester's department_id
            scope_check = await db.execute(
                select(User).join(AssetRequest, AssetRequest.requester_id == User.id)
                .where(and_(
                    AssetRequest.id == po.asset_request_id,
                    User.department_id == user_dept_id if user_dept_id else False
                ))
            )
            if not scope_check.scalars().first():
                 raise HTTPException(status_code=404, detail="PO not found or unauthorized")

        if action.action == "APPROVE":
            po.status = "VALIDATED"
        elif action.action == "REJECT":
            po.status = "REJECTED"
        
        await db.commit()
        audit = AuditLog(
            entity_type="PurchaseOrder",
            entity_id=str(action.asset_id),
            action=f"WORKFLOW_{action.action}",
            performed_by=current_user.id,
            details={"notes": action.notes, "new_status": po.status}
        )
        db.add(audit)
        await db.commit()
        return {"status": "success", "message": f"PO {action.asset_id} updated to {po.status}"}

    # 3. Check AssetRequest
    result = await db.execute(select(AssetRequest).where(AssetRequest.id == action.asset_id))
    areq = result.scalars().first()
    if areq:
        if user_role != "ADMIN" and user_role != "MANAGER":
             raise HTTPException(status_code=403, detail="Insufficient authority to action asset requests")
        
        # ROOT FIX: Scoping check for manager
        if user_role == "MANAGER":
             result = await db.execute(select(User).where(User.id == areq.requester_id))
             requester = result.scalars().first()
             if not requester or requester.department_id != user_dept_id:
                  raise HTTPException(status_code=403, detail="Unauthorized: Request is in a different department")

        if action.action == "APPROVE":
            areq.status = "MANAGER_APPROVED"
            areq.current_owner_role = "IT_MANAGEMENT"
        elif action.action == "REJECT":
            areq.status = "MANAGER_REJECTED"
            areq.current_owner_role = "END_USER"
        
        await db.commit()
        audit = AuditLog(
            entity_type="AssetRequest",
            entity_id=str(action.asset_id),
            action=f"WORKFLOW_{action.action}",
            performed_by=current_user.id,
            details={"notes": action.notes, "new_status": areq.status}
        )
        db.add(audit)
        await db.commit()
        return {"status": "success", "message": f"Asset Request {action.asset_id} updated to {areq.status}"}

    raise HTTPException(status_code=404, detail="Resource not found")
