import asyncio
import os
import sys
import uuid

# Add the 'backend' directory to sys.path
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if base_dir not in sys.path:
    sys.path.append(base_dir)

from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from app.database.database import AsyncSessionLocal
from app.models.models import User, Department, AssignmentGroup, Ticket
from app.services.ticket_service import get_tickets

async def verify_privacy_audit():
    """
    Verify the 'Wall of Privacy' by simulating a Manager's view.
    """
    async with AsyncSessionLocal() as db:
        # Pick HR Manager and IT Manager
        hr_mgr_res = await db.execute(select(User).where(User.email == "manager.hr@itsm-test.com"))
        hr_mgr = hr_mgr_res.scalars().first()
        
        it_mgr_res = await db.execute(select(User).where(User.email == "manager.it@itsm-test.com"))
        it_mgr = it_mgr_res.scalars().first()
        
        if not hr_mgr or not it_mgr:
            print("Skipping audit: Managers not found.")
            return

        print(f"--- Privacy Audit: HR Manager ({hr_mgr.full_name}) ---")
        # In a real scenario, the router calls get_tickets(department="Human Resources")
        hr_tickets = await get_tickets(db, department="Human Resources")
        
        # Audit: Should see ALL Human Resources tickets (Internal + External to HR)
        # But should NOT see 'INTERNAL' tickets of other departments
        other_internal_count = 0
        for t in hr_tickets:
            if "INTERNAL:" in t.subject and "Human Resources" not in t.subject:
                other_internal_count += 1
                print(f"  [ERROR] Leak detected: {t.subject}")

        print(f"  Total HR-scoped tickets seen: {len(hr_tickets)}")
        print(f"  Unauthorized internal tickets seen: {other_internal_count}")
        
        if other_internal_count == 0:
            print("SUCCESS: HR Manager cannot see internal tickets of other departments.")

        print(f"\n--- Privacy Audit: IT Manager ({it_mgr.full_name}) ---")
        it_tickets = await get_tickets(db, department="Information Technology")
        
        other_internal_count_it = 0
        for t in it_tickets:
            # Note: IT often sees more, but strictly 'INTERNAL' tickets for non-IT depts should be hidden
            if "INTERNAL:" in t.subject and "Information Technology" not in t.subject:
                # Unless IT is the assignment group
                if t.assignment_group_name != "IT Support Team":
                    other_internal_count_it += 1
                    print(f"  [ERROR] Leak detected: {t.subject}")

        print(f"  Total IT-scoped tickets seen: {len(it_tickets)}")
        print(f"  Unauthorized internal tickets seen: {other_internal_count_it}")

        if other_internal_count_it == 0:
            print("SUCCESS: IT Manager/Support only sees authorized departmental data.")

if __name__ == "__main__":
    asyncio.run(verify_privacy_audit())
