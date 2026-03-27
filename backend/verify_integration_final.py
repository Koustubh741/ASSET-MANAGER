import asyncio
from app.database.database import AsyncSessionLocal
from app.models.models import AuditLog, PatchComplianceSnapshot
from sqlalchemy import select, desc

async def verify_integration():
    async with AsyncSessionLocal() as db:
        print("--- Final Integration Verification ---")
        
        print("\n[Audit Log Check]")
        # Schema fix: timestamp instead of created_at
        result = await db.execute(
            select(AuditLog).order_by(desc(AuditLog.timestamp)).limit(10)
        )
        logs = result.scalars().all()
        for log in logs:
            print(f"Time: {log.timestamp} | Action: {log.action} | Entity: {log.entity_type} | Details: {log.details}")

        print("\n[Snapshot Check]")
        snap_result = await db.execute(select(PatchComplianceSnapshot).limit(5))
        snaps = snap_result.scalars().all()
        print(f"Found {len(snaps)} snapshots in database.")
        
        print("\n--- Verification Complete ---")

if __name__ == "__main__":
    asyncio.run(verify_integration())
