import asyncio
import uuid
import sys
import os
from datetime import datetime

# Add root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import AsyncSessionLocal
from app.models.models import Ticket, User
from sqlalchemy import select

async def simulate_bulk_tickets():
    async with AsyncSessionLocal() as db:
        print("\n=== STARTING BULK TICKET SIMULATION ===\n")
        
        # 1. Identify some technicians (IT_MANAGEMENT)
        res_techs = await db.execute(select(User).where(User.role == "IT_MANAGEMENT"))
        technicians = res_techs.scalars().all()
        
        if not technicians:
            print("[ERROR] No technicians found in the database. Please seed users first.")
            return
            
        print(f"[INFO] Found {len(technicians)} technicians for assignment.")

        # 2. Identify a requestor (END_USER)
        res_user = await db.execute(select(User).where(User.role == "END_USER").limit(1))
        requestor = res_user.scalars().first()
        
        if not requestor:
            print("[ERROR] No requestor found in the database.")
            return

        # 3. Create Multiple Tickets
        subjects = [
            "Monitor flickering in Conference Room A",
            "Slow VPN connection for remote staff",
            "Request for Adobe Creative Cloud license",
            "Keyboard replacement for Rachel Zane",
            "Printer jammed on 4th floor",
            "Cannot connect to office Wi-Fi",
            "Laptop battery drains too fast",
            "Software installation request: VS Code"
        ]

        for i, subject in enumerate(subjects):
            # Rotate assignment among technicians
            tech = technicians[i % len(technicians)]
            
            new_ticket = Ticket(
                id=uuid.uuid4(),
                subject=subject,
                description=f"Automated test ticket for {subject}. Reported by simulation.",
                status="IN_PROGRESS" if i % 2 == 0 else "Open",
                priority="High" if i % 3 == 0 else "Medium",
                category="Hardware" if "Monitor" in subject or "Keyboard" in subject or "Printer" in subject else "Software",
                requestor_id=requestor.id,
                assigned_to_id=tech.id if i % 2 == 0 else None, # Assign half immediately
                created_at=datetime.utcnow()
            )
            
            # Add timeline event if assigned
            if new_ticket.assigned_to_id:
                new_ticket.timeline = [{
                    "action": "ASSIGNED",
                    "byRole": "SYSTEM",
                    "byUser": "Simulation Engine",
                    "timestamp": datetime.utcnow().isoformat(),
                    "comment": f"Auto-assigned to {tech.full_name} for immediate resolution."
                }]
            
            db.add(new_ticket)
            print(f"[NEW] Created Ticket: {subject} | Assigned: {tech.full_name if new_ticket.assigned_to_id else 'Unassigned'}")

        await db.commit()
        print("\n[SUCCESS] Bulk ticket simulation complete.")

if __name__ == "__main__":
    asyncio.run(simulate_bulk_tickets())
