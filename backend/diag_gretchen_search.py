"""
Diagnostic: Check for any other Gretchens or tickets with Gretchen in the name but no assigned_to_id.
"""
import asyncio
import os, sys
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, or_
from app.models.models import Ticket, User

DATABASE_URL = os.getenv("DATABASE_URL", "").replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def main():
    async with AsyncSessionLocal() as db:
        print("--- All Users with 'Gretchen' ---")
        q = await db.execute(select(User).where(User.full_name.ilike("%gretchen%")))
        users = q.scalars().all()
        for u in users:
            print(f"  ID: {u.id}, Name: {u.full_name}, Role: {u.role}")
            
        print("\n--- Tickets mentioning 'Gretchen' ---")
        q = await db.execute(
            select(Ticket)
            .where(or_(
                Ticket.subject.ilike("%gretchen%"),
                Ticket.description.ilike("%gretchen%"),
                Ticket.requestor_name.ilike("%gretchen%")
            ))
        )
        tickets = q.scalars().all()
        for t in tickets:
            print(f"  ID: {t.id}, Subject: {t.subject}, Assigned: {t.assigned_to_id}")

asyncio.run(main())
