import asyncio
import sys
import os
sys.path.insert(0, os.getcwd())
from app.database.database import AsyncSessionLocal
from app.models.models import User, Ticket
from sqlalchemy import select

async def find_paras():
    async with AsyncSessionLocal() as db:
        # 1. Find User
        stmt = select(User).where(User.full_name.ilike("%Paras Saini%"))
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            print("User Paras Saini not found.")
            return

        print(f"User Found: {user.full_name} ({user.id})")
        print(f"Email: {user.email}")
        
        # 2. Find Tickets
        stmt = select(Ticket).where(Ticket.requestor_id == user.id)
        result = await db.execute(stmt)
        tickets = result.scalars().all()
        
        if not tickets:
            print("No tickets found for this user.")
            return
            
        for t in tickets:
            print(f"--- Ticket ---")
            print(f"ID: {t.id}")
            print(f"Subject: {t.subject}")
            print(f"Status: {t.status}")
            print(f"Priority: {t.priority}")
            print(f"Description: {t.description}")
            print(f"Resolution Status: {t.resolution_percentage}%")

if __name__ == "__main__":
    asyncio.run(find_paras())
