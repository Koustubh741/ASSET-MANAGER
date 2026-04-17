"""
Gate Pass router — authorizes physical movement of assets.
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

from ..database.database import get_db
from ..models.models import GatePass, Asset, User, Department
from ..utils.auth_utils import get_current_user

router = APIRouter(
    prefix="/gate-pass",
    tags=["gate-pass"]
)

APPROVER_ROLES = {"ADMIN", "IT_MANAGEMENT", "ASSET_MANAGER"}
STAFF_ROLES = {"ADMIN", "IT_MANAGEMENT", "IT_USER", "ASSET_MANAGER", "PROCUREMENT", "FINANCE"}


class GatePassCreate(BaseModel):
    asset_id: UUID
    issued_to: str
    reason: str
    destination: Optional[str] = None
    valid_until: Optional[datetime] = None


class GatePassResponse(BaseModel):
    id: str
    asset_id: str
    asset_name: Optional[str] = None
    issued_to: str
    issued_by: str
    approved_by: Optional[str] = None
    reason: str
    destination: Optional[str] = None
    valid_until: Optional[str] = None
    status: str
    created_at: str

    class Config:
        from_attributes = True


@router.get("", response_model=List[GatePassResponse])
async def list_gate_passes(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List all gate passes (staff roles). Scope to domain if not admin."""
    user_role = (current_user.role or "").strip().upper()
    if user_role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Unauthorized")

    user_domain = current_user.domain or ""
    user_dept = (current_user.dept_obj.name if current_user.dept_obj else "") or ""

    if user_role == "ADMIN":
        query = select(GatePass).order_by(GatePass.created_at.desc())
    else:
        # Scope by Asset owner's domain/department
        query = (
            select(GatePass)
            .join(Asset, GatePass.asset_id == Asset.id)
            .join(User, Asset.assigned_to_id == User.id)
            .outerjoin(Department, User.department_id == Department.id)
            .where(or_(User.domain.ilike(f"%{user_domain}%"), Department.name.ilike(f"%{user_dept}%")))
            .order_by(GatePass.created_at.desc())
        )

    result = await db.execute(query)
    passes = result.scalars().all()

    # Fetch asset names in a single batch
    asset_ids = list({gp.asset_id for gp in passes})
    asset_map = {}
    if asset_ids:
        ar = await db.execute(select(Asset).where(Asset.id.in_(asset_ids)))
        for a in ar.scalars().all():
            asset_map[a.id] = a.name

    return [
        GatePassResponse(
            id=str(gp.id),
            asset_id=str(gp.asset_id),
            asset_name=asset_map.get(gp.asset_id),
            issued_to=gp.issued_to,
            issued_by=gp.issued_by,
            approved_by=gp.approved_by,
            reason=gp.reason,
            destination=gp.destination,
            valid_until=gp.valid_until.isoformat() if gp.valid_until else None,
            status=gp.status,
            created_at=gp.created_at.isoformat() if gp.created_at else "",
        )
        for gp in passes
    ]


@router.post("", response_model=GatePassResponse, status_code=201)
async def create_gate_pass(
    payload: GatePassCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new gate pass request. Verify asset is within scope."""
    user_role = (current_user.role or "").strip().upper()
    if user_role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Unauthorized")

    user_domain = current_user.domain or ""
    user_dept = (current_user.dept_obj.name if current_user.dept_obj else "") or ""

    # Verify asset exists and is within scope
    query = select(Asset).where(Asset.id == payload.asset_id)
    if user_role != "ADMIN":
        query = query.join(User, Asset.assigned_to_id == User.id).outerjoin(Department, User.department_id == Department.id).where(
            or_(User.domain.ilike(f"%{user_domain}%"), Department.name.ilike(f"%{user_dept}%"))
        )

    ar = await db.execute(query)
    asset = ar.scalars().first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found or unauthorized")

    gp = GatePass(
        asset_id=payload.asset_id,
        issued_to=payload.issued_to,
        issued_by=current_user.full_name,
        reason=payload.reason,
        destination=payload.destination,
        valid_until=payload.valid_until,
        status="PENDING",
    )
    db.add(gp)
    await db.commit()
    await db.refresh(gp)

    return GatePassResponse(
        id=str(gp.id),
        asset_id=str(gp.asset_id),
        asset_name=asset.name,
        issued_to=gp.issued_to,
        issued_by=gp.issued_by,
        approved_by=gp.approved_by,
        reason=gp.reason,
        destination=gp.destination,
        valid_until=gp.valid_until.isoformat() if gp.valid_until else None,
        status=gp.status,
        created_at=gp.created_at.isoformat() if gp.created_at else "",
    )


@router.patch("/{pass_id}/approve")
async def approve_gate_pass(
    pass_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Approve a gate pass (IT Management / Admin only). Verify scope."""
    user_role = (current_user.role or "").strip().upper()
    if user_role not in APPROVER_ROLES:
        raise HTTPException(status_code=403, detail="Only IT Management or Admin can approve gate passes")

    user_domain = current_user.domain or ""
    user_dept = (current_user.dept_obj.name if current_user.dept_obj else "") or ""

    query = select(GatePass).where(GatePass.id == pass_id)
    if user_role != "ADMIN":
        query = query.join(Asset, GatePass.asset_id == Asset.id).join(User, Asset.assigned_to_id == User.id).outerjoin(Department, User.department_id == Department.id).where(
            or_(User.domain.ilike(f"%{user_domain}%"), Department.name.ilike(f"%{user_dept}%"))
        )

    result = await db.execute(query)
    gp = result.scalars().first()
    if not gp:
        raise HTTPException(status_code=404, detail="Gate pass not found or unauthorized")

    gp.status = "APPROVED"
    gp.approved_by = current_user.full_name
    await db.commit()
    return {"status": "approved", "pass_id": str(pass_id)}


@router.patch("/{pass_id}/revoke")
async def revoke_gate_pass(
    pass_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Revoke an approved gate pass. Verify scope."""
    user_role = (current_user.role or "").strip().upper()
    if user_role not in APPROVER_ROLES:
        raise HTTPException(status_code=403, detail="Only IT Management or Admin can revoke gate passes")

    user_domain = current_user.domain or ""
    user_dept = (current_user.dept_obj.name if current_user.dept_obj else "") or ""

    query = select(GatePass).where(GatePass.id == pass_id)
    if user_role != "ADMIN":
        query = query.join(Asset, GatePass.asset_id == Asset.id).join(User, Asset.assigned_to_id == User.id).outerjoin(Department, User.department_id == Department.id).where(
            or_(User.domain.ilike(f"%{user_domain}%"), Department.name.ilike(f"%{user_dept}%"))
        )

    result = await db.execute(query)
    gp = result.scalars().first()
    if not gp:
        raise HTTPException(status_code=404, detail="Gate pass not found or unauthorized")

    gp.status = "REVOKED"
    await db.commit()
    return {"status": "revoked", "pass_id": str(pass_id)}
