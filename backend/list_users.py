import asyncio
from app.database.database import AsyncSessionLocal
from app.models.models import User
from sqlalchemy import select

async def fetch_users():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User))
        users = res.scalars().all()
        for u in users:
            print(f"Name: {u.full_name} | Email: {u.email} | Role: {u.role} | Position: {u.position} | Dept: {u.department or u.domain}")

if __name__ == "__main__":
    asyncio.run(fetch_users())
