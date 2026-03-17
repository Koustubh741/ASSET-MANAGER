import asyncio
import os
import sys

sys.path.append(os.getcwd())

from app.database.database import AsyncSessionLocal
from app.models.models import User
from sqlalchemy.future import select

async def activate_it_users():
    """Activate all pending IT Management users"""
    async with AsyncSessionLocal() as session:
        # Find pending IT Management users
        result = await session.execute(
            select(User).filter(
                User.role == "IT_MANAGEMENT",
                User.status == "PENDING"
            )
        )
        pending_users = result.scalars().all()
        
        if not pending_users:
            print("[OK] No pending IT Management users found.")
            print("All IT Management accounts are already active.")
            return
        
        print(f"\n[FOUND] {len(pending_users)} pending IT Management users:\n")
        for user in pending_users:
            print(f"  - {user.full_name} ({user.email})")
        
        print("\n[ACTIVATING] Setting status to ACTIVE...")
        for user in pending_users:
            user.status = "ACTIVE"
        
        await session.commit()
        print(f"\n[SUCCESS] Activated {len(pending_users)} IT Management users!")
        print("\nThese users can now log in and see MANAGER_APPROVED requests.")

if __name__ == "__main__":
    asyncio.run(activate_it_users())
