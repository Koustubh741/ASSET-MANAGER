import asyncio
from sqlalchemy import select
from app.database.database import AsyncSessionLocal
from app.models.models import User

async def dump_emails():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User.email, User.status))
        users = result.all()
        for email, status in users:
            print(f"{email} [{status}]")

if __name__ == "__main__":
    asyncio.run(dump_emails())
