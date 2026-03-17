"""
Exit service layer - Handles user offboarding, asset return, and inventory reintegration (Asynchronous).
"""
from datetime import datetime
from typing import Dict, Any, List, Optional
import uuid
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from ..models.models import User, Asset, AssetAssignment, AssetInventory, ByodDevice, AuditLog

async def handle_user_exit(db: AsyncSession, user_id: UUID, actor_id: Optional[UUID] = None, qc_results: Dict[str, str] = None) -> Dict[str, Any]:
    """
    Handles the atomic exit workflow for a user (Asynchronous).
    """
    qc_results = qc_results or {}
    
    # 1. Fetch User
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise Exception(f"User {user_id} not found")

    # 2. Fetch all currently assigned assets
    asset_result = await db.execute(select(Asset).filter(Asset.assigned_to_id == user_id))
    assets = asset_result.scalars().all()
    
    byod_result = await db.execute(select(ByodDevice).filter(ByodDevice.owner_id == user_id))
    byod_devices = byod_result.scalars().all()

    summary = {
        "total_assets": len(assets) + len(byod_devices),
        "returned_to_inventory": 0,
        "sent_for_repair": 0,
        "scrapped": 0,
        "byod_decommissioned": 0,
        "processed_ids": []
    }

    try:
        # A) Process COMPANY_OWNED assets
        for asset in assets:
            old_status = asset.status
            qc_outcome = qc_results.get(asset.id, 'PASSED')
            
            new_status = "In Stock"
            availability = True
            
            if qc_outcome == 'FAILED':
                new_status = "Repair"
                availability = False
                summary["sent_for_repair"] += 1
            elif qc_outcome == 'EOL':
                new_status = "Scrap"
                availability = False
                summary["scrapped"] += 1
            else:
                summary["returned_to_inventory"] += 1
            
            # Update Asset record
            asset.status = new_status
            asset.assigned_to = None
            asset.assigned_by = None
            asset.assignment_date = None
            asset.disposal_status = "WIPE_PENDING"
            
            # Update Inventory Table
            inv_result = await db.execute(select(AssetInventory).filter(AssetInventory.asset_id == asset.id))
            inventory_item = inv_result.scalars().first()
            if not inventory_item:
                inventory_item = AssetInventory(
                    id=uuid.uuid4(),
                    asset_id=asset.id,
                    location=asset.location,
                )
                db.add(inventory_item)
            
            inventory_item.status = "Available" if new_status == "In Stock" else new_status
            inventory_item.availability_flag = availability
            inventory_item.last_checked_at = datetime.now()
            inventory_item.location = asset.location
            
            # Audit Log
            audit = AuditLog(
                id=uuid.uuid4(),
                entity_type="Asset",
                entity_id=asset.id,
                action="ASSET_RETURNED_ON_EXIT",
                performed_by=actor_id,
                details={
                    "old_status": old_status,
                    "new_status": new_status,
                    "qc_outcome": qc_outcome,
                    "user_id": user_id,
                    "reason": "User Exit/Resignation"
                }
            )
            db.add(audit)
            summary["processed_ids"].append(asset.id)

        # B) Process BYOD devices
        for byod in byod_devices:
            old_compliance = byod.compliance_status
            byod.compliance_status = "DECOMMISSIONED"
            
            # Audit Log
            audit = AuditLog(
                id=uuid.uuid4(),
                entity_type="ByodDevice",
                entity_id=byod.id,
                action="BYOD_DECOMMISSIONED_ON_EXIT",
                performed_by=actor_id,
                details={
                    "old_status": old_compliance,
                    "new_status": "DECOMMISSIONED",
                    "user_id": user_id
                }
            )
            db.add(audit)
            summary["byod_decommissioned"] += 1
            summary["processed_ids"].append(byod.id)

        # 3. Update User Status
        user.status = "DISABLED"
        
        await db.commit()
        
    except Exception as e:
        await db.rollback()
        raise e

    return summary
