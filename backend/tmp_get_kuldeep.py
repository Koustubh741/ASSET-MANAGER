import asyncio
from sqlalchemy.future import select
from app.database.database import AsyncSessionLocal
from app.models.models import User

async def get_kuldeep():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).filter(User.full_name.ilike('%kuldeep%')))
        user = res.scalars().first()
        if user:
            print(f"ID: {user.id} | Name: {user.full_name} | Role: {user.role} | Email: {user.email}")
        else:
            print("Kuldeep not found.")

if __name__ == "__main__":
    asyncio.run(get_kuldeep())
