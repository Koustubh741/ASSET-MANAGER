import asyncio
from sqlalchemy import select
from app.database.database import AsyncSessionLocal
from app.models.models import User

async def list_admins():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(User.role.in_(['SYSTEM_ADMIN', 'ADMIN'])))
        users = res.scalars().all()
        for u in users:
            print(f"{u.email} | {u.full_name} | {u.role}")

if __name__ == "__main__":
    asyncio.run(list_admins())
