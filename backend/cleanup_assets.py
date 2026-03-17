
import asyncio
from sqlalchemy import select, delete, func
from app.database.database import AsyncSessionLocal
from app.models.models import Asset, AuditLog, AssetAssignment
from datetime import datetime

async def cleanup_duplicates():
    async with AsyncSessionLocal() as db:
        print("[*] Starting Asset Cleanup...")
        
        # 1. Get all hostnames that appear more than once
        res = await db.execute(
            select(Asset.name)
            .group_by(Asset.name)
            .having(func.count(Asset.id) > 1)
        )
        duplicate_names = [r[0] for r in res.all()]
        
        if not duplicate_names:
            print("[+] No duplicates found.")
            return

        print(f"[*] Found {len(duplicate_names)} hostnames with duplicates.")
        
        total_deleted = 0
        
        for name in duplicate_names:
            # Get all assets for this name, sorted by most recently updated
            # Note: models.py shows updated_at or created_at. I'll use ID order as fallback
            res = await db.execute(
                select(Asset)
                .filter(Asset.name == name)
                .order_by(Asset.id.desc()) # Simple fallback
            )
            rows = res.scalars().all()
            
            # Keep the "best" one
            # Strategy: Prefer real serial over TRIG-/STUB-, then most recent
            def rank(a):
                score = 0
                sn = (a.serial_number or "").upper()
                if sn and not sn.startswith("TRIG-") and not sn.startswith("STUB-"):
                    score += 100
                return score

            sorted_rows = sorted(rows, key=lambda x: rank(x), reverse=True)
            master = sorted_rows[0]
            to_delete = sorted_rows[1:]
            
            print(f"  - Hostname '{name}': Keeping {master.id} ({master.serial_number}), deleting {len(to_delete)} duplicates.")
            
            for dup in to_delete:
                # 2. Redirect/Cleanup related records if necessary
                # Audit logs: entity_id is a string matching asset.id
                await db.execute(
                    delete(AuditLog).filter(AuditLog.entity_id == str(dup.id))
                )
                
                # AssetAssignments
                await db.execute(
                    delete(AssetAssignment).filter(AssetAssignment.asset_id == dup.id)
                )
                
                # Finally delete the asset
                await db.delete(dup)
                total_deleted += 1
        
        await db.commit()
        print(f"\n[OK] Cleanup Complete! Removed {total_deleted} duplicate asset records.")

if __name__ == "__main__":
    asyncio.run(cleanup_duplicates())
