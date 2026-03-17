import asyncio
from app.database.database import get_db
from app.models.models import User
from sqlalchemy.future import select

async def list_users():
    async for db in get_db():
        result = await db.execute(select(User))
        users = result.scalars().all()
        print(f"{'Email':<30} | {'Status':<10} | {'Role':<15} | {'Hash?':<5}")
        print("-" * 65)
        for user in users:
            has_hash = "Yes" if user.password_hash else "No"
            print(f"{user.email:<30} | {user.status:<10} | {user.role:<15} | {has_hash:<5}")
        break

if __name__ == "__main__":
    asyncio.run(list_users())
