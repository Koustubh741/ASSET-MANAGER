from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from ..models.models import Asset, User, DiscoveredSoftware
from ..schemas.discovery_schema import DiscoveryPayload
from datetime import datetime
import uuid
import logging

logger = logging.getLogger(__name__)

async def process_discovery_payload(db: AsyncSession, payload: DiscoveryPayload) -> Asset:
    """
    Process incoming discovery payload and upsert asset.
    """
    # 1. Search for existing asset by Serial Number
    query = select(Asset).filter(Asset.serial_number == payload.hardware.serial)
    result = await db.execute(query)
    db_asset = result.scalars().first()
    
    # Standardized specifications blob - mapped to keys the frontend expects
    specs = {
        "OS": f"{payload.os.name} {payload.os.version}",
        "Processor": payload.hardware.cpu,
        "RAM": f"{round(payload.hardware.ram_mb / 1024)} GB",
        "Storage": f"{payload.hardware.storage_gb} GB" if payload.hardware.storage_gb else "N/A",
        "Condition": payload.hardware.condition or "Excellent",
        "IP Address": payload.ip_address,
        "Last Scan": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "AD User": payload.hardware.ad_user,
        "AD Domain": payload.hardware.ad_domain,
        "Agent ID": str(payload.agent_id)
    }
    
    # Auto-User Mapping Logic
    assigned_user_id = None
    if payload.hardware.ad_user and payload.hardware.ad_user != "Unknown":
        # Attempt to find user by email or username
        # AD user often comes as 'DOMAIN\Username' or just 'Username'
        clean_user = payload.hardware.ad_user.split('\\')[-1].lower()
        logger.info(f"AD Mapping Attempt: clean_user={clean_user}")
        user_query = select(User).filter(
            (User.email.ilike(f"{clean_user}%")) | 
            (User.full_name.ilike(f"%{clean_user}%"))
        )
        user_result = await db.execute(user_query)
        matched_user = user_result.scalars().first()
        if matched_user:
            logger.info(f"Auto-mapping asset {payload.hostname} to user {matched_user.email} (ID: {matched_user.id})")
            assigned_user_id = matched_user.id
        else:
            logger.warning(f"No user match found for AD user: {clean_user}")

    if db_asset:
        # Update existing asset
        logger.info(f"Updating discovered asset: {payload.hostname} (SN: {payload.hardware.serial})")
        db_asset.name = payload.hostname
        db_asset.model = payload.hardware.model
        db_asset.vendor = payload.hardware.vendor
        db_asset.type = payload.hardware.type or db_asset.type
        db_asset.specifications = specs
        if assigned_user_id and not db_asset.assigned_to_id:
            db_asset.assigned_to_id = assigned_user_id
        db_asset.updated_at = datetime.now()
    else:
        # Create new discovered asset
        logger.info(f"Creating new discovered asset: {payload.hostname} (SN: {payload.hardware.serial})")
        db_asset = Asset(
            id=uuid.uuid4(),
            name=payload.hostname,
            type=payload.hardware.type or "Desktop", 
            model=payload.hardware.model,
            vendor=payload.hardware.vendor,
            serial_number=payload.hardware.serial,
            assigned_to_id=assigned_user_id,
            status="Discovered",
            segment="IT",
            specifications=specs
        )
        db.add(db_asset)
    
    # Flush to get db_asset.id if it's new
    await db.flush()

    # 2. Sync Software Inventory (DiscoveredSoftware)
    if payload.software is not None:
        logger.info(f"Syncing {len(payload.software)} software items for asset {db_asset.name}")
        # Delete existing discovered software for this asset to perform a clean sync
        await db.execute(delete(DiscoveredSoftware).where(DiscoveredSoftware.asset_id == db_asset.id))
        
        for soft in payload.software:
            new_soft = DiscoveredSoftware(
                id=uuid.uuid4(),
                asset_id=db_asset.id,
                name=soft.name[:255], # Ensure within limits
                version=soft.version[:100] if soft.version else "Unknown",
                vendor=soft.vendor[:255] if soft.vendor else "Unknown"
            )
            db.add(new_soft)

    await db.commit()
    await db.refresh(db_asset)
    return db_asset
