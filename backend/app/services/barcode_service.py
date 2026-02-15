from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..schemas.discovery_schema import BarcodeScanPayload
import uuid
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

async def process_barcode_scan(db: AsyncSession, payload: BarcodeScanPayload) -> dict:
    """
    Process a barcode/QR scan event from a frontend scanner or mobile agent.
    If the asset exists, mark as verified.
    If it doesn't exist, create a 'Skeleton' asset for later completion.
    """
    from ..models.models import Asset, AuditLog
    
    query = select(Asset).filter(Asset.serial_number == payload.serial_number)
    result = await db.execute(query)
    asset = result.scalars().first()
    
    action = "verified"
    
    if asset:
        logger.info(f"Barcode scan: Verifying existing asset {asset.serial_number}")
        # Update status if it was just discovered or in stock
        if asset.status in ["Discovered", "In Stock", "Ready for Deployment"]:
            asset.status = "Verified"
        
        # Update location if provided
        if payload.location:
            asset.location_text = payload.location
            
        # Update specifications metadata
        specs = asset.specifications or {}
        specs["Last Physical Scan"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        asset.specifications = specs
        asset.updated_at = datetime.now()
    else:
        logger.info(f"Barcode scan: Registering new skeleton asset {payload.serial_number}")
        action = "registered"
        # Create Skeleton Asset
        asset = Asset(
            id=uuid.uuid4(),
            name=f"New Asset (SN: {payload.serial_number})",
            type="Unknown",
            model="Pending Identification",
            vendor="Unknown",
            serial_number=payload.serial_number,
            status="Discovered", # Or "Registering"
            location_text=payload.location,
            segment="IT",
            specifications={
                "Discovery Source": "Barcode Scan",
                "Scan Date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        )
        db.add(asset)
    
    # Audit Log
    audit = AuditLog(
        id=str(uuid.uuid4()),
        action=f"barcode_{action}",
        entity_type="Asset",
        entity_id=str(asset.id) if asset.id else "NEW",
        details={
            "serial": payload.serial_number,
            "scan_type": payload.scan_type,
            "location": payload.location,
            "technician_id": str(payload.technician_id) if payload.technician_id else None
        }
    )
    db.add(audit)
    
    await db.commit()
    return {
        "status": "success",
        "action": action,
        "asset_id": str(asset.id),
        "serial": asset.serial_number
    }
