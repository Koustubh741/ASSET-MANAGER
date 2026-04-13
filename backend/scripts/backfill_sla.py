import asyncio
import os
import sys
from uuid import UUID

# Add backend directory to sys.path for internal imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from sqlalchemy.future import select
from backend.app.database.database import AsyncSessionLocal
from backend.app.models.models import Ticket
from backend.app.models.automation import TicketSLA
from backend.app.services.automation_service import AutomationService

async def backfill_slas():
    print("Starting Strategic SLA Backfill...")
    async with AsyncSessionLocal() as db:
        # 1. Identify orphans (tickets without SLA records)
        sla_subquery = select(TicketSLA.ticket_id)
        orphan_query = select(Ticket.id).where(Ticket.id.not_in(sla_subquery))
        
        result = await db.execute(orphan_query)
        orphan_ids = result.scalars().all()
        
        total = len(orphan_ids)
        print(f"Found {total} tickets missing SLA metadata.")
        
        if total == 0:
            print("All tickets already have SLA coverage. No action needed.")
            return

        print("Initializing SLA records...")
        success = 0
        errors = 0
        
        for i, tid in enumerate(orphan_ids):
            try:
                # Use the robust service logic to calculate deadlines based on ticket.created_at
                await AutomationService.initialize_ticket_sla(db, tid)
                success += 1
                if (i + 1) % 5 == 0 or (i + 1) == total:
                    print(f"Progress: {i + 1}/{total} processed...")
            except Exception as e:
                print(f"Error initializing SLA for ticket {tid}: {e}")
                errors += 1
        
        await db.commit()
        print("\n" + "="*40)
        print(f"Backfill Complete!")
        print(f"Success: {success}")
        print(f"Errors:  {errors}")
        print("="*40)

if __name__ == "__main__":
    asyncio.run(backfill_slas())
