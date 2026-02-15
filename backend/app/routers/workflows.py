from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from ..services import asset_service
from ..schemas.asset_schema import AssetUpdate
from ..database.database import get_db
from ..models.models import AssetRequest, PurchaseRequest, Asset
from ..services import asset_request_service
from ..utils.auth_utils import get_current_user
from datetime import date

router = APIRouter(
    prefix="/workflows",
    tags=["workflows"]
)

@router.post("/review/{asset_id}")
async def review_renewal(
    asset_id: UUID, 
    action: str, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
    comments: Optional[str] = None
):
    """
    Review asset renewal (Asynchronous).
    """
    if current_user.role not in ["ADMIN", "SYSTEM_ADMIN", "FINANCE", "PROCUREMENT_FINANCE", "IT_MANAGEMENT"]:
        raise HTTPException(status_code=403, detail="Unauthorized to review renewals")
    asset = await asset_service.get_asset_by_id(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    current_status = asset.renewal_status
    new_status = current_status
    
    if action == "reject":
        new_status = "Rejected"
    elif action == "approve":
        if current_status == "Requested":
            new_status = "IT_Approved"
        elif current_status == "IT_Approved":
            new_status = "Finance_Approved"
        elif current_status == "Finance_Approved":
            new_status = "Commercial_Approved" 
            
    if new_status != current_status:
        await asset_service.update_asset(db, asset_id, AssetUpdate(renewal_status=new_status))
        return {"status": "success", "new_status": new_status}
    
    return {"status": "no_change", "current_status": current_status}

@router.post("/procurement/{asset_id}")
async def manage_procurement(
    asset_id: UUID, 
    action: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Manage asset procurement workflow (Asynchronous).
    """
    if current_user.role not in ["ADMIN", "SYSTEM_ADMIN", "PROCUREMENT", "PROCUREMENT_FINANCE", "ASSET_MANAGER"]:
        raise HTTPException(status_code=403, detail="Unauthorized to manage procurement")
    asset = await asset_service.get_asset_by_id(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Check if there's a linked asset request
    res_req = await db.execute(select(AssetRequest).filter(AssetRequest.asset_id == asset_id))
    asset_request = res_req.scalars().first()
    
    if asset_request and asset_request.status != "IT_APPROVED":
        raise HTTPException(
            status_code=403,
            detail="Procurement not allowed before IT approval"
        )
    
    current = asset.procurement_status
    new_status = current
    
    if action == "approve":
        if current == "Requested": new_status = "Approved"
        elif current == "Approved": new_status = "Ordered"
        elif current == "Ordered": new_status = "Received"
    
    if new_status == "Received":
        # Asset becomes active inventory
        await asset_service.update_asset(db, asset_id, AssetUpdate(procurement_status=None, status="In Stock"))

        # Re-fetch request just in case
        if asset_request:
            if asset_request.status == "PROCUREMENT_APPROVED":
                asset_request.status = "QC_PENDING"
                await db.commit()
                return {"status": "success", "message": "Asset Received, moved to In Stock, status set to QC_PENDING"}
            elif asset_request.status in ["PROCUREMENT_REQUESTED", "IT_APPROVED"]:
                # Legacy support: direct assignment
                requester = await asset_request_service.get_user_by_id_db(db, asset_request.requester_id)
                requester_name = requester.full_name if requester else asset_request.requester_id

                assigned = await asset_service.assign_asset(
                    db,
                    asset_id=asset_id,
                    user=requester_name,
                    location=asset.location or (requester.location if requester else None) or "Unknown",
                    assign_date=date.today(),
                )
                if assigned:
                    asset_request.status = "IN_USE"
                    await db.commit()
                    return {"status": "success", "message": "Asset Received and assigned"}

        return {"status": "success", "message": "Asset Received, moved to In Stock"}

    if new_status != current:
        await asset_service.update_asset(db, asset_id, AssetUpdate(procurement_status=new_status))
        return {"status": "success", "new_status": new_status}
        
    return {"status": "no_change"}

@router.post("/disposal/{asset_id}")
async def manage_disposal(
    asset_id: UUID, 
    action: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Manage asset disposal workflow (Asynchronous).
    """
    if current_user.role not in ["ADMIN", "SYSTEM_ADMIN", "ASSET_MANAGER", "IT_SUPPORT"]:
        raise HTTPException(status_code=403, detail="Unauthorized to manage disposal")
    asset = await asset_service.get_asset_by_id(db, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    current = asset.disposal_status
    new_status = current
    
    if action == "validate":
        new_status = "Ready_For_Wipe"
    elif action == "wipe":
        new_status = "Wiped"
    elif action == "dispose":
        new_status = "Disposed"
        
    if new_status != current:
        if new_status == "Disposed":
             await asset_service.update_asset(db, asset_id, AssetUpdate(disposal_status=new_status, status="Retired"))
        else:
             await asset_service.update_asset(db, asset_id, AssetUpdate(disposal_status=new_status))
             
        return {"status": "success", "new_status": new_status}

    return {"status": "no_change"}
