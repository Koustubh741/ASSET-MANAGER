
import asyncio
from app.database.database import AsyncSessionLocal
from app.models.models import User
from sqlalchemy.future import select

async def check_users():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User))
        users = result.scalars().all()
        print("--- USER LIST ---")
        for u in users:
            print(f"ID: {u.id} | Email: {u.email} | Role: {u.role} | Position: {u.position}")

if __name__ == "__main__":
    asyncio.run(check_users())
