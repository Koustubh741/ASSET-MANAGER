import asyncio
import os
import sys

# Add the backend directory to sys.path
sys.path.append(os.getcwd())

from app.database.database import AsyncSessionLocal
from app.models.models import User
from sqlalchemy.future import select

async def check_users():
    async with AsyncSessionLocal() as session:
        # Get Cloud manager
        result = await session.execute(select(User).filter(User.domain == 'cloud', User.position == 'MANAGER'))
        managers = result.scalars().all()
        print("Cloud Managers:")
        for m in managers:
            print(f"Name: {m.full_name} | Email: {m.email} | Dept: {m.department} | Domain: {m.domain} | Role: {m.role}")

        # Also get Cloud team members
        result = await session.execute(select(User).filter(User.domain == 'cloud', User.position != 'MANAGER'))
        members = result.scalars().all()
        print("\nCloud Team Members:")
        for m in members:
            print(f"Name: {m.full_name} | Email: {m.email} | Dept: {m.department} | Domain: {m.domain} | Role: {m.role}")

if __name__ == "__main__":
    asyncio.run(check_users())
