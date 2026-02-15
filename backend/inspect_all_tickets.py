import asyncio
import os
import sys

# Add the backend directory to sys.path
sys.path.append(os.getcwd())

from app.database.database import AsyncSessionLocal
from app.models.models import Ticket, User
from sqlalchemy.future import select

async def inspect_all_tickets():
    async with AsyncSessionLocal() as session:
        print("\n--- All Tickets in DB ---")
        result = await session.execute(select(Ticket))
        tickets = result.scalars().all()
        if not tickets:
            print("No tickets found in DB.")
        for t in tickets:
            # Try to get user info manually
            user_res = await session.execute(select(User).filter(User.id == t.requestor_id))
            u = user_res.scalars().first()
            user_info = f"UID: {u.id}, Name: {u.full_name}, Dept: {u.department}" if u else f"UID: {t.requestor_id} (NOT FOUND)"
            print(f"ID: {t.id}, Subject: {t.subject}, Status: {t.status}, Requester: {user_info}")

if __name__ == "__main__":
    asyncio.run(inspect_all_tickets())
