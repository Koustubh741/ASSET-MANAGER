import asyncio
import sys
import os
sys.path.insert(0, os.getcwd())
from app.database.database import AsyncSessionLocal
from app.models.models import User
from sqlalchemy import select

async def check_it_manager():
    async with AsyncSessionLocal() as db:
        stmt = select(User).where(User.email == "it_manager@itsm.com")
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            print("User it_manager@itsm.com not found.")
            return

        print(f"User: {user.full_name}")
        print(f"Role: {user.role}")
        print(f"Position: {user.position}")
        print(f"Department: {user.department}")
        print(f"Domain: {user.domain}")
        print(f"Status: {user.status}")

if __name__ == "__main__":
    asyncio.run(check_it_manager())
