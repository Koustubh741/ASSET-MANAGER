
import asyncio
from sqlalchemy import select, delete, func, text, update
from app.database.database import AsyncSessionLocal
from app.models.models import Asset, AuditLog, AssetAssignment
import uuid

async def cleanup_duplicates():
    async with AsyncSessionLocal() as db:
        print("[*] Starting Robust Asset Cleanup & Merge...")
        
        # 1. Get all hostnames that appear more than once
        res = await db.execute(
            select(Asset.name)
            .group_by(Asset.name)
            .having(func.count(Asset.id) > 1)
        )
        duplicate_names = [r[0] for r in res.all()]
        
        if not duplicate_names:
            print("[+] No duplicate hostnames found.")
            return

        print(f"[*] Found {len(duplicate_names)} hostnames with duplicates.")
        
        total_deleted = 0
        
        # Tables that use UUID FKs to assets
        fk_tables = [
            ("asset.maintenance_records", "asset_id"),
            ("asset.discovery_diffs", "asset_id"),
            ("asset.gate_passes", "asset_id"),
            ("asset.remote_sessions", "asset_id"),
            ("asset.patch_deployments", "asset_id"),
            ("asset.asset_inventory", "asset_id"),
            ("asset.asset_assignments", "asset_id")
        ]
        
        # Relationships are special (two columns)
        rel_table = ("asset.asset_relationships", ["source_asset_id", "target_asset_id"])

        for name in duplicate_names:
            res = await db.execute(select(Asset).filter(Asset.name == name).order_by(Asset.id.desc()))
            rows = res.scalars().all()
            
            # Rank best record
            def rank(a):
                score = 0
                sn = (a.serial_number or "").upper()
                if sn and not sn.startswith("TRIG-") and not sn.startswith("STUB-"):
                    score += 100
                return score

            sorted_rows = sorted(rows, key=rank, reverse=True)
            master = sorted_rows[0]
            to_delete = sorted_rows[1:]
            
            master_id = master.id
            
            for dup in to_delete:
                dup_id = dup.id
                
                # Update normal FKs
                for table, col in fk_tables:
                    await db.execute(text(f"UPDATE {table} SET {col} = :m_id WHERE {col} = :d_id"), {"m_id": master_id, "d_id": dup_id})
                
                # Update relationship columns
                for col in rel_table[1]:
                    await db.execute(text(f"UPDATE {rel_table[0]} SET {col} = :m_id WHERE {col} = :d_id"), {"m_id": master_id, "d_id": dup_id})
                
                # Update AuditLog (string ID)
                await db.execute(
                    update(AuditLog)
                    .where(AuditLog.entity_id == str(dup_id))
                    .values(entity_id=str(master_id))
                )
                
                # Handle unique constraints in inventory or assignments that might clash after merge
                # (Simple approach: delete duplicates from those child tables if they already exist for master)
                # But for now, let's just commit and see.
                
                await db.delete(dup)
                total_deleted += 1
            
            print(f"  - Merged '{name}': Kept {master_id}, removed {len(to_delete)} duplicates.")

        await db.commit()
        print(f"\n[OK] Cleanup Complete! Merged and removed {total_deleted} duplicate asset records.")

if __name__ == "__main__":
    asyncio.run(cleanup_duplicates())
