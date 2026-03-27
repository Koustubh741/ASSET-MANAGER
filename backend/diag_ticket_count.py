"""
Diagnostic: Check ticket count and assignment distribution.
"""
import asyncio
import os, sys
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, func
from app.models.models import Ticket

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(DATABASE_URL)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def check_tickets():
    async with async_session() as db:
        count_res = await db.execute(select(func.count(Ticket.id)))
        total = count_res.scalar()
        print(f"Total Tickets in DB: {total}")
        
        status_res = await db.execute(select(Ticket.status, func.count(Ticket.id)).group_by(Ticket.status))
        print("Status Distribution:")
        for status, count in status_res:
            print(f"  - {status}: {count}")
            
        unassigned_res = await db.execute(select(func.count(Ticket.id)).where(Ticket.assigned_to_id == None))
        print(f"Unassigned Tickets: {unassigned_res.scalar()}")
        
if __name__ == "__main__":
    asyncio.run(check_tickets())
