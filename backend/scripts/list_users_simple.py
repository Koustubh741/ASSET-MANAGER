import asyncio
from sqlalchemy import select
from app.database.database import AsyncSessionLocal
from app.models.models import User

async def list_users():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User))
        users = res.scalars().all()
        for u in users:
            print(f"USER: {u.email} | ROLE: {u.role} | DOMAIN: {u.domain} | DEPT_ID: {u.department_id}")

if __name__ == "__main__":
    asyncio.run(list_users())
