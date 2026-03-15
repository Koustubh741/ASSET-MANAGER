import asyncio
from sqlalchemy import select
from app.database.database import SessionLocal
from app.models.models import User

async def list_ids():
    async with SessionLocal() as db:
        result = await db.execute(select(User).filter(User.role != 'END_USER'))
        users = result.scalars().all()
        print(f"{'Email':<30} | {'Name':<20} | {'ID':<36} | {'Dept/Role'}")
        print("-" * 100)
        for u in users:
            dept = u.department or u.role
            print(f"{str(u.email):<30} | {str(u.full_name):<20} | {str(u.id):<36} | {dept}")

if __name__ == "__main__":
    asyncio.run(list_ids())
