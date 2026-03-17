import asyncio
import uuid
import sys
import os
from sqlalchemy import select, update

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


from app.database.database import AsyncSessionLocal
from app.models.models import Ticket, User

async def verify_push_db_support():
    async with AsyncSessionLocal() as db:
        print("=== DATABASE INTEGRITY AUDIT: PUSH MODEL ===")
        
        # 1. Fetch a technician to use for assignment
        result = await db.execute(select(User).where(User.email == 'it_staff@itsm.com'))
        tech = result.scalars().first()
        if not tech:
            print("[FAIL] Technician 'it_staff@itsm.com' not found.")
            return

        print(f"[PASS] Tech found: {tech.full_name} ({tech.id})")

        # 2. Fetch an unassigned ticket
        result = await db.execute(select(Ticket).where(Ticket.assigned_to_id == None).limit(1))
        ticket = result.scalars().first()
        if not ticket:
            print("[NOTE] No unassigned tickets found. Finding any ticket for structural check.")
            result = await db.execute(select(Ticket).limit(1))
            ticket = result.scalars().first()
        
        if not ticket:
            print("[FAIL] No tickets found in database.")
            return

        print(f"[PASS] Ticket found: {ticket.subject} ({ticket.id})")
        original_assignee = ticket.assigned_to_id

        # 3. Structural Check: Verify assigned_to_id field exists and can be updated
        try:
            print(f"[ACTION] Simulating 'Push' assignment to {tech.full_name}...")
            # We don't want to actually persist a permanent change if possible, 
            # or we can just update it and then revert.
            # But here let's actually perform the update to verify integrity.
            ticket.assigned_to_id = tech.id
            await db.flush()
            
            # Re-fetch to verify
            result = await db.execute(select(Ticket).where(Ticket.id == ticket.id))
            updated_ticket = result.scalars().first()
            
            if updated_ticket.assigned_to_id == tech.id:
                print(f"[SUCCESS] Database persists assignment correctly.")
            else:
                print(f"[FAIL] Database did not reflect the assignment change.")
            
            # Revert
            ticket.assigned_to_id = original_assignee
            await db.commit()
            print("[PASS] Reverted database state.")
            
        except Exception as e:
            print(f"[FAIL] Database error during assignment simulation: {str(e)}")

if __name__ == "__main__":
    asyncio.run(verify_push_db_support())
