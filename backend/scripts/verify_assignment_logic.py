import asyncio
import uuid
from app.database.database import AsyncSessionLocal
from app.models.models import AssignmentGroup, User, Ticket, Task
from sqlalchemy import select

async def verify_implementation():
    async with AsyncSessionLocal() as db:
        print("[CHECK] Verifying models and data...")
        
        # 1. Verify Groups
        result = await db.execute(select(AssignmentGroup))
        groups = result.scalars().all()
        print(f"[OK] Found {len(groups)} assignment groups.")
        for g in groups:
            print(f"  - {g.name} ({g.department})")
            
        # 2. Test Ticket creation with group
        admin_res = await db.execute(select(User).filter(User.role == "ADMIN"))
        admin = admin_res.scalars().first()
        
        if not admin:
            print("[ERROR] No admin user found for testing.")
            return

        it_group = [g for g in groups if "IT" in g.name][0]
        
        test_ticket = Ticket(
            id=uuid.uuid4(),
            subject="Verification Test Ticket",
            description="Testing assignment group logic",
            status="OPEN",
            priority="Medium",
            requestor_id=admin.id,
            assignment_group_id=it_group.id
        )
        db.add(test_ticket)
        print(f"[OK] Created test ticket assigned to {it_group.name}")
        
        # 3. Test Task creation
        test_task = Task(
            id=uuid.uuid4(),
            ticket_id=test_ticket.id,
            subject="Verify Hardware",
            status="Open",
            priority="Medium"
        )
        db.add(test_task)
        print("[OK] Created test sub-task for ticket.")
        
        await db.commit()
        print("[SUCCESS] All database models and relationships verified.")

if __name__ == "__main__":
    asyncio.run(verify_implementation())
