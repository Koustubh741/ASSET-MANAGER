import asyncio
import random
from sqlalchemy import select, update
from app.database.database import async_engine, AsyncSessionLocal
from app.models.models import User, Ticket

async def main():
    async with AsyncSessionLocal() as db:
        # Find IT_SUPPORT users
        res_users = await db.execute(select(User).filter(User.role.in_(["IT_SUPPORT", "SUPPORT_SPECIALIST"])))
        support_users = res_users.scalars().all()
        
        if not support_users:
            print("No IT support users found.")
            return
            
        support_ids = [u.id for u in support_users]
        print(f"Found {len(support_users)} support users.")
        
        # Find RESOLVED tickets currently assigned to ADMIN/IT_MANAGEMENT
        res_tickets = await db.execute(
            select(Ticket).join(User, Ticket.assigned_to_id == User.id)
            .filter(Ticket.status == "RESOLVED")
            .filter(User.role.in_(["ADMIN", "IT_MANAGEMENT"]))
        )
        resolved_tickets = res_tickets.scalars().all()
        
        if not resolved_tickets:
             print("No misassigned resolved tickets found.")
             # Fallback: grab any resolved tickets to reassign
             res_tickets2 = await db.execute(select(Ticket).filter(Ticket.status == "RESOLVED"))
             resolved_tickets = res_tickets2.scalars().all()
             
             if not resolved_tickets:
                  print("No resolved tickets at all found in the DB. Test data might be very empty.")
                  return
        
        print(f"Reassigning {len(resolved_tickets)} tickets...")
        
        for t in resolved_tickets:
            # Assign randomly to one of our support users
            new_assignee = random.choice(support_ids)
            t.assigned_to_id = new_assignee
            
        await db.commit()
        print("Successfully re-assigned resolved tickets to IT Support staff.")

asyncio.run(main())
