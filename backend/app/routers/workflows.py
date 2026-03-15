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
from ..models.models import Asset, PurchaseOrder, User, AssetRequest
from ..utils.auth_utils import get_current_user

router = APIRouter(
    prefix="/workflows",
    tags=["workflows"]
)

STAFF_ROLES = {"ADMIN", "IT_MANAGEMENT", "ASSET_MANAGER", "PROCUREMENT", "FINANCE"}


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
    Scoped to user domain/department.
    """
    user_role = (current_user.role or "").strip().upper()
    if user_role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Unauthorized")

    user_domain = current_user.domain or ""
    user_dept = current_user.department or ""

    today = date.today()
    ninety_days = today + timedelta(days=90)

    if user_role == "ADMIN":
        query = select(Asset).where(and_(Asset.warranty_expiry <= ninety_days, Asset.warranty_expiry >= today))
    else:
        # Join with User for scoping, but allow unassigned assets
        # For staff roles, we show their domain/dept assigned assets OR any unassigned assets
        query = (
            select(Asset)
            .outerjoin(User, Asset.assigned_to_id == User.id)
            .where(
                and_(
                    Asset.warranty_expiry <= ninety_days,
                    Asset.warranty_expiry >= today,
                    or_(
                        Asset.assigned_to_id == None,
                        or_(User.domain.ilike(f"%{user_domain}%"), User.department.ilike(f"%{user_dept}%"))
                    )
                )
            )
        )

    result = await db.execute(query)
    assets = result.scalars().all()
    today = date.today()
    renewal_list = []
    for a in assets:
        urgency = "Low"
        if a.warranty_expiry:
            days_left = (a.warranty_expiry - today).days
            if days_left <= 7: urgency = "Immediate"
            elif days_left <= 30: urgency = "High"
            elif days_left <= 60: urgency = "Medium"
        
        renewal_list.append(
            WorkflowAssetResponse(
                id=str(a.id),
                name=a.name,
                type=a.type or "Unknown",
                status=a.status,
                serial_number=a.serial_number,
                warranty_expiry=a.warranty_expiry.isoformat() if a.warranty_expiry else None,
                cost=a.cost,
                renewal_cost=a.cost, # Estimation for renewal
                renewal_urgency=urgency
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
    Scoped to user domain/department.
    """
    user_role = (current_user.role or "").strip().upper()
    if user_role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Unauthorized")

    user_domain = current_user.domain or ""
    user_dept = current_user.department or ""

    if user_role == "ADMIN":
        query = select(PurchaseOrder).where(PurchaseOrder.status.in_(["UPLOADED", "PENDING"]))
    else:
        # Join via AssetRequest -> User
        query = (
            select(PurchaseOrder)
            .join(AssetRequest, PurchaseOrder.asset_request_id == AssetRequest.id)
            .join(User, AssetRequest.requester_id == User.id)
            .where(
                and_(
                    PurchaseOrder.status.in_(["UPLOADED", "PENDING"]),
                    or_(User.domain.ilike(f"%{user_domain}%"), User.department.ilike(f"%{user_dept}%"))
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
    Scoped to user domain/department.
    """
    user_role = (current_user.role or "").strip().upper()
    if user_role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Unauthorized")

    user_domain = current_user.domain or ""
    user_dept = current_user.department or ""

    if user_role == "ADMIN":
        query = select(Asset).where(Asset.status.in_(["Retired", "Disposed"]))
    else:
        # Join with User for scoping, but allow unassigned assets
        query = (
            select(Asset)
            .outerjoin(User, Asset.assigned_to_id == User.id)
            .where(
                and_(
                    Asset.status.in_(["Retired", "Disposed"]),
                    or_(
                        Asset.assigned_to_id == None,
                        or_(User.domain.ilike(f"%{user_domain}%"), User.department.ilike(f"%{user_dept}%"))
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


@router.post("/action")
async def process_workflow_action(
    action: WorkflowAction,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Process a workflow action (Approve/Reject/Defer).
    Verifies authority and scope.
    """
    user_role = (current_user.role or "").strip().upper()
    if user_role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Unauthorized")

    user_domain = current_user.domain or ""
    user_dept = current_user.department or ""

    # Check if asset/PO exists and is in scope
    # First check Asset table
    result = await db.execute(select(Asset).where(Asset.id == action.asset_id))
    asset = result.scalars().first()
    
    if asset:
        # Verify scope if not admin
        if user_role != "ADMIN":
             # Use a subquery or join-based check for the single asset
             scope_check = await db.execute(
                 select(User).where(and_(User.id == asset.assigned_to_id, or_(User.domain.ilike(f"%{user_domain}%"), User.department.ilike(f"%{user_dept}%"))))
             )
             if not scope_check.scalars().first():
                 raise HTTPException(status_code=404, detail="Asset not found or unauthorized")

        if action.action == "APPROVE":
            asset.status = "Active"
        elif action.action == "REJECT":
            asset.status = "Disposed"
        
        await db.commit()
        return {"status": "success", "message": f"Asset {action.asset_id} updated to {asset.status}"}

    # If not in Asset, check PurchaseOrder
    result = await db.execute(select(PurchaseOrder).where(PurchaseOrder.id == action.asset_id))
    po = result.scalars().first()
    if po:
        # Verify PO scope
        if user_role != "ADMIN":
            scope_check = await db.execute(
                select(User).join(AssetRequest, AssetRequest.requester_id == User.id)
                .where(and_(AssetRequest.id == po.asset_request_id, or_(User.domain.ilike(f"%{user_domain}%"), User.department.ilike(f"%{user_dept}%"))))
            )
            if not scope_check.scalars().first():
                 raise HTTPException(status_code=404, detail="PO not found or unauthorized")

        if action.action == "APPROVE":
            po.status = "VALIDATED"
        elif action.action == "REJECT":
            po.status = "REJECTED"
        
        await db.commit()
        return {"status": "success", "message": f"PO {action.asset_id} updated to {po.status}"}

    raise HTTPException(status_code=404, detail="Resource not found")
