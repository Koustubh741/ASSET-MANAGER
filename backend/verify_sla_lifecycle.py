import asyncio
from uuid import UUID
from app.database.database import AsyncSessionLocal
from app.models.models import Ticket
from app.models.automation import TicketSLA
from app.services.automation_service import AutomationService
from sqlalchemy.future import select

async def verify_sla_lifecycle():
    ticket_id = UUID("98cfca5a-90a8-4ff9-a38d-09fddc3c00d8") # Use the one I last assigned
    async with AsyncSessionLocal() as db:
        # 1. Reset SLA for testing
        res = await db.execute(select(TicketSLA).where(TicketSLA.ticket_id == ticket_id))
        sla = res.scalars().first()
        if not sla:
            print("SLA not found for ticket")
            return
        
        print(f"Initial State: Response={sla.response_status}, Resolution={sla.resolution_status}")
        sla.response_status = "IN_PROGRESS"
        sla.resolution_status = "IN_PROGRESS"
        await db.commit()
        
        # 2. Test Mark Responded
        print("Executing mark_sla_responded...")
        await AutomationService.mark_sla_responded(db, ticket_id)
        await db.refresh(sla)
        print(f"After Response: Response={sla.response_status}, Resolution={sla.resolution_status}")
        
        # 3. Test Mark Resolved
        print("Executing mark_sla_resolved...")
        await AutomationService.mark_sla_resolved(db, ticket_id)
        await db.refresh(sla)
        print(f"After Resolution: Response={sla.response_status}, Resolution={sla.resolution_status}")
        
        # Final Assertions
        assert sla.response_status == "MET"
        assert sla.resolution_status == "MET"
        print("SLA Lifecycle Verification SUCCESSFUL")

if __name__ == "__main__":
    asyncio.run(verify_sla_lifecycle())
