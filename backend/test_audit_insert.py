import asyncio
import uuid
from app.database.database import AsyncSessionLocal
from app.models.models import AuditLog, User
from sqlalchemy import select

async def test():
    async with AsyncSessionLocal() as db:
        user_res = await db.execute(select(User).where(User.email == "admin@itsm.com"))
        user = user_res.scalars().first()
        
        log = AuditLog(
            id=uuid.uuid4(),
            performed_by=user.id if user else None,
            action="TEST_ACTION",
            entity_type="Test",
            entity_id="test-id",
            details={"msg": "test"}
        )
        db.add(log)
        await db.commit()
        print("Success")

if __name__ == "__main__":
    asyncio.run(test())
