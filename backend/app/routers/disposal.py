from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from ..database.database import get_db
from ..models.models import Asset, AuditLog
from ..utils import auth_utils
import uuid
from uuid import UUID
from datetime import datetime

router = APIRouter(
    prefix="/disposal",
    tags=["disposal"]
)

async def check_disposal_access(
    current_user = Depends(auth_utils.get_current_user)
):
    """
    Verify user has permission to manage asset disposal (Asynchronous).
    """
    allowed_roles = ["ADMIN", "ASSET_MANAGER", "IT_MANAGEMENT", "IT_SUPPORT", "FINANCE", "PROCUREMENT"]
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User role {current_user.role} does not have permission to manage asset disposal"
        )
    return current_user

@router.get("/queue")
async def get_disposal_queue(
    db: AsyncSession = Depends(get_db),
    user = Depends(check_disposal_access)
):
    """
    Get all assets that are in some stage of disposal (Asynchronous).
    """
    result = await db.execute(
        select(Asset).filter(Asset.disposal_status.in_(["SCRAP_CANDIDATE", "WIPE_PENDING", "WIPED"]))
    )
    assets = result.scalars().all()
    return assets

@router.post("/{asset_id}/initiate")
async def initiate_disposal(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
    user = Depends(check_disposal_access)
):
    """
    Mark an asset for disposal (Asynchronous).
    """
    result = await db.execute(select(Asset).filter(Asset.id == asset_id))
    asset = result.scalars().first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    asset.disposal_status = "SCRAP_CANDIDATE"
    asset.status = "Scrap"
    
    audit = AuditLog(
        id=uuid.uuid4(),
        entity_type="Asset",
        entity_id=asset.id,
        action="DISPOSAL_INITIATED",
        performed_by=user.id,
        details={"status": "SCRAP_CANDIDATE"}
    )
    db.add(audit)
    await db.commit()
    return {"status": "success", "disposal_status": "SCRAP_CANDIDATE"}

@router.post("/{asset_id}/validate")
async def validate_disposal(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
    user = Depends(check_disposal_access)
):
    """
    Confirm asset is ready for data wipe (Asynchronous).
    """
    result = await db.execute(select(Asset).filter(Asset.id == asset_id))
    asset = result.scalars().first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    asset.disposal_status = "WIPE_PENDING"
    
    await db.commit()
    return {"status": "success", "disposal_status": "WIPE_PENDING"}

@router.post("/{asset_id}/wipe")
async def record_wipe(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
    user = Depends(check_disposal_access)
):
    """
    Record that the asset has been securely wiped (Asynchronous).
    """
    result = await db.execute(select(Asset).filter(Asset.id == asset_id))
    asset = result.scalars().first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    asset.disposal_status = "WIPED"
    
    audit = AuditLog(
        id=uuid.uuid4(),
        entity_type="Asset",
        entity_id=asset.id,
        action="DATA_WIPE_COMPLETED",
        performed_by=user.id,
        details={"method": "DoD 5220.22-M"}
    )
    db.add(audit)
    await db.commit()
    return {"status": "success", "disposal_status": "WIPED"}

@router.post("/{asset_id}/finalize")
async def finalize_disposal(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
    user = Depends(check_disposal_access)
):
    """
    Permanently retire the asset (Asynchronous).
    """
    result = await db.execute(select(Asset).filter(Asset.id == asset_id))
    asset = result.scalars().first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    asset.disposal_status = "RETIRED"
    asset.status = "Retired"
    asset.assigned_to = None
    asset.location = "Disposal Archive"
    
    audit = AuditLog(
        id=uuid.uuid4(),
        entity_type="Asset",
        entity_id=asset.id,
        action="ASSET_RETIRED",
        performed_by=user.id,
        details={"final_status": "RETIRED"}
    )
    db.add(audit)
    await db.commit()
    return {"status": "success", "disposal_status": "RETIRED"}
