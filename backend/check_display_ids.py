import asyncio
import os
import sys
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# App setup
sys.path.append(os.path.abspath(os.getcwd()))
from app.models.models import Ticket
from app.database.database import DATABASE_URL

async def check():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        res = await session.execute(select(Ticket.id, Ticket.display_id).limit(10))
        print("ID | DISPLAY_ID")
        for r in res.all():
            print(f"{r[0]} | {r[1]}")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check())
