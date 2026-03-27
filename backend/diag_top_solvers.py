"""
Diagnostic: Who has the most resolved tickets?
"""
import asyncio
import os, sys
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, func
from app.models.models import Ticket, User

DATABASE_URL = os.getenv("DATABASE_URL", "").replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def main():
    async with AsyncSessionLocal() as db:
        print("--- Top Solvers in DB ---")
        q = await db.execute(
            select(User.full_name, func.count(Ticket.id))
            .join(Ticket, Ticket.assigned_to_id == User.id)
            .where(Ticket.status == "RESOLVED")
            .group_by(User.full_name)
            .order_by(func.count(Ticket.id).desc())
        )
        for name, count in q.all():
            print(f"  {name}: {count}")

asyncio.run(main())
