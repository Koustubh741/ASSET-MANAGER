import asyncio
import sys
import os

# Add backend to path
backend_path = "d:\\ASSET-MANAGER\\backend"
sys.path.append(backend_path)

from app.database.database import AsyncSessionLocal
from app.models.models import User
from sqlalchemy import select

async def check_user():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(User.email == 'admin@itsm.com'))
        user = res.scalars().first()
        if user:
            print(f"ID: {user.id}")
            print(f"Email: {user.email}")
            print(f"Status: {user.status}")
            print(f"Role: {user.role}")
            print(f"Department: {user.department}")
        else:
            print("User admin@itsm.com not found")

if __name__ == "__main__":
    asyncio.run(check_user())
