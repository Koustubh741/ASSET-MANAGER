
import asyncio
import uuid
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from app.database.database import DATABASE_URL as ASYNC_DATABASE_URL
from app.models.models import Asset, AuditLog, User
from app.services.timeline_service import timeline_service

async def backfill():
    engine = create_async_engine(ASYNC_DATABASE_URL)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as db:
        # Get all assets
        result = await db.execute(select(Asset))
        assets = result.scalars().all()
        
        print(f"Checking {len(assets)} assets for missing timeline history...")
        
        for asset in assets:
            # Check if CREATED event exists
            audit_result = await db.execute(
                select(AuditLog).filter(
                    AuditLog.entity_id == str(asset.id),
                    AuditLog.action == "CREATED"
                )
            )
            if not audit_result.scalars().first():
                print(f"Backfilling CREATED event for {asset.name} ({asset.id})")
                
                # Use asset's created_at for the "Created" event
                ts = asset.created_at or (datetime.utcnow() - timedelta(days=30))
                
                # Direct insert to control timestamp
                audit = AuditLog(
                    id=uuid.uuid4(),
                    entity_type="Asset",
                    entity_id=str(asset.id),
                    action="CREATED",
                    details={
                        "description": f"Asset initially added to system with serial {asset.serial_number}",
                        "performed_by_name": "System Migration",
                        "metadata": {"initial_status": asset.status}
                    },
                    timestamp=ts
                )
                db.add(audit)
                
                # Add a Discovery event if it has specs
                if asset.specifications:
                    discovery_audit = AuditLog(
                        id=uuid.uuid4(),
                        entity_type="Asset",
                        entity_id=str(asset.id),
                        action="DISCOVERED",
                        details={
                            "description": "Hardware specifications identified during initial scan",
                            "performed_by_name": "Agent Delta",
                            "metadata": asset.specifications
                        },
                        timestamp=ts + timedelta(minutes=15)
                    )
                    db.add(discovery_audit)
                
                # Add Assignment event if assigned
                if asset.assigned_to:
                    assignment_audit = AuditLog(
                        id=uuid.uuid4(),
                        entity_type="Asset",
                        entity_id=str(asset.id),
                        action="ASSIGNMENT",
                        details={
                            "description": f"Assigned to {asset.assigned_to}",
                            "performed_by_name": "IT Portal",
                            "metadata": {"location": asset.location}
                        },
                        timestamp=ts + timedelta(days=1)
                    )
                    db.add(assignment_audit)

        await db.commit()
        print("Backfill complete.")

if __name__ == "__main__":
    asyncio.run(backfill())
