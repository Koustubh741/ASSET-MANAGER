"""
Helper function for automated inventory routing logic.
This module provides utilities to check inventory availability and auto-route asset requests.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from ..models.models import AssetInventory, Asset
from typing import Optional
from uuid import UUID


async def check_inventory_availability(
    db: AsyncSession,
    asset_type: str,
    asset_model: Optional[str] = None
) -> Optional[UUID]:
    """
    Check if an asset matching the request criteria is available in inventory.
    
    Args:
        db: Database session
        asset_type: Type of asset requested (e.g., "Laptop", "Server")
        asset_model: Optional specific model requested
        
    Returns:
        Asset ID if available, None if no matching asset in stock
    """
    # Build query to find available assets
    query = (
        select(AssetInventory, Asset)
        .join(Asset, AssetInventory.asset_id == Asset.id)
        .filter(
            AssetInventory.availability_flag == True,
            AssetInventory.status == "Available",
            Asset.type == asset_type,
            Asset.status == "In Stock"
        )
    )
    
    # Add model filter if specified
    if asset_model:
        query = query.filter(Asset.model == asset_model)
    
    result = await db.execute(query)
    inventory_asset = result.first()
    
    if inventory_asset:
        return inventory_asset[1].id  # Return Asset ID
    
    return None


async def reserve_inventory_asset(
    db: AsyncSession,
    asset_id: UUID,
    request_id: UUID
) -> bool:
    """
    Reserve an asset from inventory for a specific request.
    
    Args:
        db: Database session
        asset_id: ID of the asset to reserve
        request_id: ID of the asset request
        
    Returns:
        True if successfully reserved, False otherwise
    """
    from ..models.models import AssetRequest, User
    
    # Get request to find requester
    req_result = await db.execute(select(AssetRequest).filter(AssetRequest.id == request_id))
    asset_request = req_result.scalars().first()
    if not asset_request:
        return False

    # Update inventory record
    inv_result = await db.execute(
        select(AssetInventory).filter(AssetInventory.asset_id == asset_id)
    )
    inventory = inv_result.scalars().first()
    
    if inventory and inventory.availability_flag:
        inventory.status = "Reserved"
        inventory.availability_flag = False
        
        # Update asset record
        asset_result = await db.execute(
            select(Asset).filter(Asset.id == asset_id)
        )
        asset = asset_result.scalars().first()
        
        if asset:
            asset.status = "Reserved"
            asset.request_id = request_id
            
            # Fetch user name for denormalized field
            user_result = await db.execute(select(User).filter(User.id == asset_request.requester_id))
            user = user_result.scalars().first()
            if user:
                asset.assigned_to = user.full_name
                asset.assigned_to_id = user.id
            
            await db.commit()
            return True
    
    return False
