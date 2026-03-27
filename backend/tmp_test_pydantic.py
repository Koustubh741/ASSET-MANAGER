import asyncio
from uuid import UUID
from app.database.database import AsyncSessionLocal
from app.services.ticket_service import get_ticket
from app.schemas.ticket_schema import TicketResponse

async def test_pydantic():
    ticket_id = UUID("830658c4-b5dc-4e13-b51c-77e4483231d0")
    async with AsyncSessionLocal() as db:
        t = await get_ticket(db, ticket_id)
        if t:
            print("DB Ticket SLA exists:", t.sla is not None)
            if t.sla:
                print("DB Ticket SLA Response Deadline:", getattr(t, 'sla_response_deadline', None))
            
            # Serialize using Pydantic
            response = TicketResponse.model_validate(t)
            print("Pydantic JSON:")
            print(response.model_dump_json(indent=2))
        else:
            print("Ticket not found")

if __name__ == "__main__":
    asyncio.run(test_pydantic())
