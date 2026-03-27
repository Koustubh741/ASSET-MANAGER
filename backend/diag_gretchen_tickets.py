"""
Diagnostic: Check tickets for Gretchen's IT account.
"""
import asyncio
import os, sys
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models.models import Ticket, User

DATABASE_URL = os.getenv("DATABASE_URL", "").replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def main():
    it_id = "7c37b28c-3b0c-41c5-8211-6343e973a7ef"
    eu_id = "52616330-22ca-4d78-bf69-71a5a4b55c57"
    
    async with AsyncSessionLocal() as db:
        for name, uid in [("IT_SUPPORT", it_id), ("END_USER", eu_id)]:
            print(f"\n--- Tickets for {name} ({uid}) ---")
            
            # Assigned to
            q = await db.execute(select(Ticket).where(Ticket.assigned_to_id == uid))
            assigned = q.scalars().all()
            print(f"  Assigned: {len(assigned)}")
            for t in assigned:
                print(f"    - [{t.status}] {t.subject}")
                
            # Requested by
            q = await db.execute(select(Ticket).where(Ticket.requestor_id == uid))
            requested = q.scalars().all()
            print(f"  Requested: {len(requested)}")

asyncio.run(main())
