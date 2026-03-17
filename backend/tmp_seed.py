import asyncio
from sqlalchemy import select, update
from app.database.database import async_engine, AsyncSessionLocal
from app.models.models import User, Ticket

async def main():
    async with AsyncSessionLocal() as db:
        # Get Koustubh
        req = await db.execute(select(User).filter(User.full_name.ilike('Koustubh')))
        k = req.scalars().first()
        if k:
             k.role = "IT_SUPPORT"
             k.position = "Specialist"
             await db.commit()
             print("Updated Koustubh to IT_SUPPORT")

asyncio.run(main())
