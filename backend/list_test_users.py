import asyncio
import sys
import os
# Add the current directory to sys.path so we can import app modules
sys.path.append(os.getcwd())

from app.database.database import SessionLocal
from sqlalchemy.future import select
from app.models.models import User

async def list_users():
    async with SessionLocal() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        print(f"{'Email':<30} | {'Role':<15} | {'Position':<20}")
        print("-" * 70)
        for u in users:
            print(f"{u.email:<30} | {u.role:<15} | {u.position or 'N/A':<20}")

if __name__ == "__main__":
    asyncio.run(list_users())
