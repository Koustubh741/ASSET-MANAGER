import asyncio
from app.database.database import AsyncSessionLocal
from app.models.models import User
from sqlalchemy import select

async def run():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User.id, User.full_name))
        for r in res.all():
            print(f"{r[0]}: {r[1]}")

if __name__ == "__main__":
    asyncio.run(run())
