import asyncio
from app.database.database import AsyncSessionLocal
from app.models.models import User
from sqlalchemy import select

async def check_users():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User.email, User.role, User.full_name))
        users = res.all()
        for user in users:
            print(f"Email: {user.email}, Role: {user.role}, Name: {user.full_name}")

if __name__ == "__main__":
    asyncio.run(check_users())
