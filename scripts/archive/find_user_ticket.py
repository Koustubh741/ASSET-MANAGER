import asyncio
import os
import sys
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload

# Add backend to sys.path
base_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(base_dir, 'backend'))

from app.database.database import AsyncSessionLocal
from app.models.models import Ticket, User, AssignmentGroup, Department

async def find_ticket():
    async with AsyncSessionLocal() as db:
        # Search by subject with typo handling
        res = await db.execute(
            select(Ticket)
            .options(
                joinedload(Ticket.assignment_group).joinedload(AssignmentGroup.dept_obj),
                joinedload(Ticket.requestor),
                joinedload(Ticket.assigned_to)
            )
            .where(
                (Ticket.display_id.ilike('%INF-02%')) | 
                (Ticket.subject.ilike('%cloud%opertions%')) |
                (Ticket.subject.ilike('%cloud%operations%'))
            )
        )
        tickets = res.unique().scalars().all()
        
        if not tickets:
            print("No matching tickets found.")
            # List some recent tickets to see what's there
            print("\nRecent tickets in system:")
            recent_res = await db.execute(select(Ticket).order_by(Ticket.created_at.desc()).limit(5))
            for rt in recent_res.scalars().all():
                print(f" - {rt.display_id}: {rt.subject} (Status: {rt.status})")
            return
            
        for t in tickets:
            print(f"--- Ticket Details ---")
            print(f"Display ID: {t.display_id}")
            print(f"Internal UUID: {t.id}")
            print(f"Subject: {t.subject}")
            print(f"Status: {t.status}")
            print(f"Priority: {t.priority}")
            print(f"Requestor: {t.requestor.full_name if t.requestor else 'N/A'}")
            print(f"Assigned To: {t.assigned_to.full_name if t.assigned_to else 'Unassigned'}")
            if t.assignment_group:
                print(f"Group: {t.assignment_group.name}")
                if t.assignment_group.dept_obj:
                    print(f"Department: {t.assignment_group.dept_obj.name}")
                else:
                    print(f"Department (Legacy): {t.assignment_group.department}")
            else:
                print("Group: Unassigned")
            print(f"Created At: {t.created_at}")
            print("-" * 20)

if __name__ == "__main__":
    asyncio.run(find_ticket())
