import asyncio
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.database.database import AsyncSessionLocal
from app.models.models import Ticket, User
from app.models.automation import TicketSLA

async def find_ticket_with_sla():
    async with AsyncSessionLocal() as db:
        # Get Kuldeep
        res = await db.execute(select(User).filter(User.full_name.ilike('%kuldeep%')))
        kuldeep = res.scalars().first()
        
        # Get a ticket with an SLA
        stmt = select(Ticket).join(TicketSLA, Ticket.id == TicketSLA.ticket_id).options(selectinload(Ticket.sla)).limit(1)
        res = await db.execute(stmt)
        ticket = res.scalars().first()
        
        if ticket:
            print(f"Assigning Ticket {ticket.id} to Kuldeep...")
            ticket.assigned_to_id = kuldeep.id
            await db.commit()
            print(f"TICKET URL: http://localhost:3000/tickets/{ticket.id}")
        else:
            print("No tickets with SLA found.")

if __name__ == "__main__":
    asyncio.run(find_ticket_with_sla())
