import asyncio
from sqlalchemy.future import select
from app.database.database import AsyncSessionLocal
from app.models.automation import SLAPolicy, TicketSLA
from app.models.models import Ticket

async def audit_sla_data():
    async with AsyncSessionLocal() as db:
        # Check Policies
        policies_res = await db.execute(select(SLAPolicy))
        policies = policies_res.scalars().all()
        print(f"--- SLA Policies ({len(policies)}) ---")
        for p in policies:
            print(f"ID: {p.id} | Name: {p.name} | Res: {p.response_time_limit}m | Rem: {p.resolution_time_limit}m")
        
        # Check Active Ticket SLAs
        slas_res = await db.execute(select(TicketSLA))
        slas = slas_res.scalars().all()
        print(f"\n--- Ticket SLAs ({len(slas)}) ---")
        for s in slas:
            print(f"Ticket ID: {s.ticket_id} | Res Status: {s.response_status} | Rem Status: {s.resolution_status} | Res Deadline: {s.response_deadline}")

if __name__ == "__main__":
    asyncio.run(audit_sla_data())
