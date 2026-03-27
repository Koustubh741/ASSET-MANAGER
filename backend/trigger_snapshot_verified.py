import asyncio
import uuid
from app.database.database import AsyncSessionLocal
from app.services.patch_snapshot_service import snapshot_daily_compliance
from app.models.models import AuditLog, User
from sqlalchemy import select

async def trigger_snapshot():
    async with AsyncSessionLocal() as db:
        user_res = await db.execute(select(User).where(User.email == "admin@itsm.com"))
        user = user_res.scalars().first()
        
        result = await snapshot_daily_compliance()
        print(f"Snapshot Result: {result}")
        
        # Add Audit Log with CORRECT SCHEMA
        db.add(AuditLog(
            id=uuid.uuid4(),
            performed_by=user.id if user else None,
            action="PATCH_SNAPSHOT_TRIGGER",
            entity_type="System",
            entity_id=str(uuid.uuid4()), 
            details={"message": f"Manual compliance snapshot triggered (Saved: {result['snapshots_saved']})"}
        ))
        await db.commit()
        print("Audit Log Entry created.")

if __name__ == "__main__":
    asyncio.run(trigger_snapshot())
