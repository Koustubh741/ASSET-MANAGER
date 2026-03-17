import asyncio
import sys
from uuid import UUID

from app.database.database import AsyncSessionLocal
from app.models.models import Asset, User
from sqlalchemy.future import select

async def create_test_asset():
    async with AsyncSessionLocal() as db:
        # Get target user
        user_result = await db.execute(select(User).filter(User.email == 'koustubh@gmail.com'))
        target_user = user_result.scalars().first()
        
        if not target_user:
            print("User koustubh@gmail.com not found. Exiting.")
            return

        print(f"Assigning test asset to user: {target_user.full_name} ({target_user.id})")

        # Create test asset
        import uuid
        test_asset = Asset(
            id=uuid.uuid4(),
            name="Test Verification Laptop",
            type="Laptop",
            model="Dell XPS 15",
            vendor="Dell",
            serial_number=f"TEST-VERIF-{str(uuid.uuid4())[:8]}",
            status="Active",
            assigned_to=target_user.full_name,
            assigned_to_id=target_user.id,
            acceptance_status="PENDING", # explicitly set to pending
            segment="IT"
        )
        
        db.add(test_asset)
        await db.commit()
        await db.refresh(test_asset)
        print(f"Test asset created and assigned successfully! Asset ID: {test_asset.id}")

if __name__ == "__main__":
    asyncio.run(create_test_asset())
