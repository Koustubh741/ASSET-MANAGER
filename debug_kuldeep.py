import asyncio
import os
import sys

# Add backend to path to import app before other imports
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import select, text
from app.database.database import AsyncSessionLocal
from app.models.models import User, Ticket

async def audit_kuldeep():
    async with AsyncSessionLocal() as db:
        # Search for Kuldeep Kumar
        print("--- User Audit ---")
        result = await db.execute(select(User).where(User.full_name.ilike('%Kuldeep%')))
        users = result.scalars().all()
        
        kuldeep_id = None
        for u in users:
            print(f"ID: {u.id}, Name: {u.full_name}, Email: {u.email}, Role: {u.role}, Dept: {u.department}")
            if "Kuldeep" in u.full_name:
                kuldeep_id = u.id

        if not kuldeep_id:
            print("❌ Kuldeep Kumar not found.")
            return

        # Search for tickets assigned to him
        print("\n--- Ticket Audit ---")
        result = await db.execute(select(Ticket).where(Ticket.assigned_to_id == kuldeep_id))
        tickets = result.scalars().all()
        
        if not tickets:
            print("❌ No tickets found assigned to this ID.")
        else:
            for t in tickets:
                print(f"Ticket: {t.id}, Subject: {t.subject}, Status: {t.status}, AssignedID: {t.assigned_to_id}")

        # Check total tickets count
        count_res = await db.execute(text("SELECT count(*) FROM support.tickets"))
        print(f"\nTotal Tickets in DB: {count_res.scalar()}")

if __name__ == "__main__":
    import os
    import sys
    # Add backend to path to import app
    sys.path.append(os.path.join(os.getcwd(), 'backend'))
    asyncio.run(audit_kuldeep())
