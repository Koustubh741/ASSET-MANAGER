import asyncio
import os
import sys

# Add the 'backend' directory to sys.path
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if base_dir not in sys.path:
    sys.path.append(base_dir)

from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from app.database.database import AsyncSessionLocal
from app.models.models import User, Department, AssignmentGroup, Ticket

async def verify_tests():
    """
    Audit the 30+ test tickets created.
    """
    async with AsyncSessionLocal() as db:
        # Fetch tickets with requestor, group, and SLA details
        result = await db.execute(
            select(Ticket)
            .options(
                joinedload(Ticket.requestor).joinedload(User.dept_obj),
                joinedload(Ticket.assignment_group).joinedload(AssignmentGroup.dept_obj),
                joinedload(Ticket.sla)
            )
            .where(Ticket.subject.ilike("%INTERNAL:%") | Ticket.subject.ilike("%EXTERNAL:%"))
        )
        tickets = result.unique().scalars().all()
        
        print(f"--- Verification Report ({len(tickets)} Test Tickets) ---")
        
        summary = {
            "Total": len(tickets),
            "Internal_Tickets": 0,
            "External_Tickets": 0,
            "SLA_Populated": 0,
            "Errors": []
        }
        
        for t in tickets:
            req_dept_id = t.requestor.department_id if t.requestor else None
            grp_dept_id = t.assignment_group.department_id if t.assignment_group else None
            
            # Logic for is_internal: should be True IF requestor_dept == group_dept
            is_internal_calc = (req_dept_id == grp_dept_id) and (req_dept_id is not None)
            
            if is_internal_calc:
                summary["Internal_Tickets"] += 1
            else:
                summary["External_Tickets"] += 1
                
            # Check SLA deadlines through the relationship
            deadline = None
            if t.sla:
                deadline = t.sla.resolution_deadline
                summary["SLA_Populated"] += 1
            
            type_label = "INTRA" if is_internal_calc else "INTER"
            print(f"[{type_label}] Subject: {t.subject}")
            print(f"      Requestor: {t.requestor.full_name} (Dept: {t.requestor.department})")
            print(f"      Group: {t.assignment_group.name} (Dept: {t.assignment_group.department})")
            print(f"      Deadline: {deadline}")
            print("-" * 30)

        print("\n--- Final Summary ---")
        print(f"Total Tickets: {summary['Total']}")
        print(f"Internal (Intra-dept): {summary['Internal_Tickets']}")
        print(f"External (Inter-dept): {summary['External_Tickets']}")
        print(f"SLA Deadlines Verified: {summary['SLA_Populated']}")
        
        if summary["SLA_Populated"] == summary["Total"] and summary["Total"] > 0:
            print("SUCCESS: All tickets have valid SLA deadlines applied via the TicketSLA relationship.")
        else:
            print(f"WARNING: Only {summary['SLA_Populated']}/{summary['Total']} tickets have deadlines.")

if __name__ == "__main__":
    asyncio.run(verify_tests())
