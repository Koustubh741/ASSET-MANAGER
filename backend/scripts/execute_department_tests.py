import asyncio
import os
import sys
import uuid
import random

# Add the 'backend' directory to sys.path
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if base_dir not in sys.path:
    sys.path.append(base_dir)

from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from app.database.database import AsyncSessionLocal
from app.models.models import User, Department, AssignmentGroup, Ticket
from app.services.ticket_service import create_ticket_v2
from app.schemas.ticket_schema import TicketCreate

async def run_tests():
    """
    Generate 2 tickets for each department:
    1. Intra-departmental (routed to their own group)
    2. Inter-departmental (routed to IT or another group)
    """
    async with AsyncSessionLocal() as db:
        # Load all departments
        res_depts = await db.execute(select(Department))
        departments = res_depts.scalars().all()
        
        # Helper to find IT Support group (global fallback)
        res_it = await db.execute(select(AssignmentGroup).where(AssignmentGroup.name.ilike("%IT Support%")))
        it_group = res_it.scalars().first()
        
        ticket_count = 0
        
        for dept in departments:
            # 1. Get the Test User for this dept
            user_res = await db.execute(select(User).where(User.email == f"user.{dept.slug}@itsm-test.com"))
            user = user_res.scalars().first()
            if not user:
                print(f"Skipping {dept.name}: user not found")
                continue
            
            # Find the group for this department by department_id
            group_res = await db.execute(select(AssignmentGroup).where(AssignmentGroup.department_id == dept.id))
            dept_groups = group_res.scalars().all()
            dept_group = dept_groups[0] if dept_groups else it_group
            
            if not dept_group:
                print(f"Skipping {dept.name}: no group found and no IT fallback")
                continue

            # --- TICKET 1: Intra-departmental (Internal) ---
            ticket_internal = TicketCreate(
                subject=f"INTERNAL: {dept.name} Maintenance",
                description=f"Automated test for internal routing within {dept.name}.",
                priority="Medium",
                category="General",
                assignment_group_id=dept_group.id
            )
            try:
                await create_ticket_v2(db, ticket_internal, requestor_id=user.id)
                print(f"  [INTRA] Created internal ticket for {dept.name} -> {dept_group.name}")
                ticket_count += 1
            except Exception as e:
                print(f"  [ERROR] Failed to create internal ticket for {dept.name}: {e}")
            
            # --- TICKET 2: Inter-departmental (External to IT) ---
            target_group = it_group if it_group and it_group.id != dept_group.id else None
            if not target_group:
                # If IT dept, pick any other group
                other_res = await db.execute(select(AssignmentGroup).where(AssignmentGroup.id != dept_group.id).limit(1))
                target_group = other_res.scalars().first()

            if target_group:
                ticket_external = TicketCreate(
                    subject=f"EXTERNAL: {dept.name} Request to {target_group.name}",
                    description=f"Automated cross-dept test from {dept.name} to {target_group.name}.",
                    priority="High",
                    category="Hardware",
                    assignment_group_id=target_group.id
                )
                try:
                    await create_ticket_v2(db, ticket_external, requestor_id=user.id)
                    print(f"  [INTER] Created external ticket from {dept.name} -> {target_group.name}")
                    ticket_count += 1
                except Exception as e:
                    print(f"  [ERROR] Failed to create external ticket for {dept.name}: {e}")

        await db.commit()
        print(f"[TEST_EXECUTION] Created {ticket_count} total test tickets across departments.")

if __name__ == "__main__":
    asyncio.run(run_tests())
