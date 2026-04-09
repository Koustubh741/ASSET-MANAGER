import asyncio
import sys
import os
from sqlalchemy import text
from uuid import UUID

# Add the backend directory to sys.path so we can import from app
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database.database import AsyncSessionLocal

async def audit_kuldeep_tickets():
    async with AsyncSessionLocal() as session:
        # Kuldeep's ID
        uid = "e5a4f7cf-bd88-4e95-bedc-c65571ac1206"
        
        # Audit Tickets Assigned to this User and their requestors
        query = text("""
            SELECT t.id, t.subject, t.status, t.requestor_id, u.full_name as requestor_name, u.department as requestor_dept
            FROM support.tickets t
            JOIN auth.users u ON t.requestor_id = u.id
            WHERE t.assigned_to_id = :uid
        """)
        result = await session.execute(query, {"uid": uid})
        tickets = result.all()
        
        print(f"--- Tickets Assigned to Kuldeep Kumar ({len(tickets)}) ---")
        for t in tickets:
            print(f"ID: {t.id}")
            print(f"Subject: {t.subject}")
            print(f"Status: {t.status}")
            print(f"Requestor: {t.requestor_name} (Dept: {t.requestor_dept})")
            print("-" * 30)

if __name__ == "__main__":
    asyncio.run(audit_kuldeep_tickets())
