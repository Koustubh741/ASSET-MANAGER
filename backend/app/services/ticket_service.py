from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import cast, String
from ..models.models import Ticket, User
from ..schemas.ticket_schema import TicketCreate, TicketUpdate
import uuid
from uuid import UUID

async def get_tickets(db: AsyncSession, requestor_id: UUID = None, department: str = None, skip: int = 0, limit: int = 100):
    """
    Get all tickets with user names, departments, and emails (Asynchronous).
    """
    query = select(Ticket, User.full_name, User.department, User.email).outerjoin(User, Ticket.requestor_id == User.id)
    
    if requestor_id:
        query = query.filter(Ticket.requestor_id == requestor_id)
    
    if department:
        from sqlalchemy import or_
        query = query.filter(
            or_(
                User.department.ilike(f"%{department}%"),
                User.domain.ilike(f"%{department}%")
            )
        )
        
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    results = result.all()
        
    tickets = []
    for t, user_name, user_dept, user_email in results:
        # Dynamically attach requestor info so Pydantic can pick it up
        if user_name:
            t.requestor_name = user_name
        if user_dept:
            t.requestor_department = user_dept
        if user_email:
            t.requestor_email = user_email
        tickets.append(t)
    return tickets

async def get_ticket(db: AsyncSession, ticket_id: UUID):
    """Get a ticket by ID (Asynchronous)."""
    result = await db.execute(select(Ticket).filter(Ticket.id == ticket_id))
    return result.scalars().first()

async def create_ticket(db: AsyncSession, ticket: TicketCreate):
    """
    [DEPRECATED] Use create_ticket_v2 which derives identity from JWT.
    """
    return await create_ticket_v2(db, ticket, requestor_id=getattr(ticket, 'requestor_id', None))

async def create_ticket_v2(db: AsyncSession, ticket: TicketCreate, requestor_id: UUID):
    """Create a new ticket with explicit requestor_id (derived from JWT)."""
    db_ticket = Ticket(
        id=uuid.uuid4(),
        requestor_id=requestor_id,
        **ticket.model_dump()
    )
    db.add(db_ticket)
    await db.commit()
    await db.refresh(db_ticket)
    return db_ticket

async def update_ticket(db: AsyncSession, ticket_id: UUID, ticket_update: TicketUpdate):
    """Update an existing ticket (Asynchronous)."""
    db_ticket = await get_ticket(db, ticket_id)
    if not db_ticket:
        return None
    
    update_data = ticket_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_ticket, key, value)
        
    await db.commit()
    await db.refresh(db_ticket)
    return db_ticket

async def delete_ticket(db: AsyncSession, ticket_id: UUID):
    """Delete a ticket (Asynchronous)."""
    db_ticket = await get_ticket(db, ticket_id)
    if db_ticket:
        await db.delete(db_ticket)
        await db.commit()
        return True
    return False
