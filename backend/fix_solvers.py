import asyncio
import sys
from sqlalchemy.future import select
import random

# Add project root to path
sys.path.append('d:/ASSET-MANAGER/backend')

from app.database.database import AsyncSessionLocal
from app.models.models import Ticket, User

async def fix_data():
    async with AsyncSessionLocal() as db:
        # Get IT technicians
        it_users_res = await db.execute(select(User).filter(User.role.in_(["IT_MANAGEMENT", "ADMIN"])))
        it_users = it_users_res.scalars().all()
        
        if not it_users:
            print("No IT technicians found.")
            return

        # Get resolved tickets without assignment
        tickets_res = await db.execute(select(Ticket).filter(Ticket.status == "RESOLVED", Ticket.assigned_to_id == None))
        tickets = tickets_res.scalars().all()
        
        print(f"Fixing {len(tickets)} resolved tickets...")
        for t in tickets:
            t.assigned_to_id = random.choice(it_users).id
            print(f"Assigning Ticket {t.id} to {t.assigned_to_id}")
            
        await db.commit()
        print("Data fixed successfully.")

if __name__ == "__main__":
    asyncio.run(fix_data())
