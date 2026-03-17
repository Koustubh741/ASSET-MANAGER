import asyncio
import sys
import os
from sqlalchemy import text
from uuid import UUID

# Add the backend directory to sys.path so we can import from app
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database.database import AsyncSessionLocal
from app.models.models import User, Ticket

async def audit_kuldeep():
    async with AsyncSessionLocal() as session:
        # 1. Audit User
        user_query = text("SELECT id, full_name, email, role, position, department FROM auth.users WHERE full_name ILike '%Kuldeep%'")
        user_result = await session.execute(user_query)
        users = user_result.all()
        
        if not users:
            print("No user found with name like 'Kuldeep'")
            return
            
        for u in users:
            print(f"--- User Audit: {u.full_name} ---")
            print(f"ID: {u.id}")
            print(f"Email: {u.email}")
            print(f"Role: {u.role}")
            print(f"Position: {u.position}")
            print(f"Department: {u.department}")
            
            # 2. Audit Tickets Assigned to this User
            ticket_query = text("SELECT id, subject, status, assigned_to_id, requestor_id FROM support.tickets WHERE assigned_to_id = :uid")
            ticket_result = await session.execute(ticket_query, {"uid": u.id})
            tickets = ticket_result.all()
            
            print(f"\nTickets assigned to {u.full_name} ({len(tickets)}):")
            for t in tickets:
                print(f"  - [{t.status}] ID: {t.id} | Subject: {t.subject}")
            
            # 3. Audit Tickets Requested by this User (just in case)
            req_query = text("SELECT id, subject, status, assigned_to_id FROM support.tickets WHERE requestor_id = :uid")
            req_result = await session.execute(req_query, {"uid": u.id})
            reqs = req_result.all()
            print(f"\nTickets requested by {u.full_name} ({len(reqs)}):")
            for r in reqs:
                print(f"  - [{r.status}] ID: {r.id} | Subject: {r.subject} | Assigned To: {r.assigned_to_id}")

if __name__ == "__main__":
    asyncio.run(audit_kuldeep())
