import asyncio
from app.database.database import AsyncSessionLocal
from app.models.models import Ticket
from app.models.automation import TicketSLA
from app.services.automation_service import AutomationService
from sqlalchemy.future import select

async def backfill_slas():
    async with AsyncSessionLocal() as db:
        # Get all tickets without SLA
        res = await db.execute(select(Ticket))
        tickets = res.scalars().all()
        
        for t in tickets:
            # Check if SLA exists
            sla_res = await db.execute(select(TicketSLA).where(TicketSLA.ticket_id == t.id))
            if not sla_res.scalars().first():
                print(f"Initializing SLA for ticket {t.id}...")
                await AutomationService.initialize_ticket_sla(db, t.id)
        
        await db.commit()
    print("Backfill complete.")

if __name__ == "__main__":
    asyncio.run(backfill_slas())
