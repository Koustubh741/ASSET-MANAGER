from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from sqlalchemy import cast, String, or_
from ..models.models import Ticket, User
from ..schemas.ticket_schema import TicketCreate, TicketUpdate
import uuid
from uuid import UUID
from datetime import datetime, timedelta, timezone
import asyncio

async def get_tickets(db: AsyncSession, requestor_id: UUID = None, department: str = None, skip: int = 0, limit: int = 100, search: str = None):
    """
    Get all tickets with user names, departments, and emails using ORM relationships.
    """
    # Use selectinload or joinedload for relationships
    query = select(Ticket).options(
        joinedload(Ticket.requestor),
        joinedload(Ticket.assigned_to)
    ).order_by(Ticket.created_at.desc())
    
    if requestor_id:
        query = query.filter(Ticket.requestor_id == requestor_id)
    
    if department:
        query = query.join(Ticket.requestor).filter(
            or_(
                User.department.ilike(f"%{department}%"),
                User.domain.ilike(f"%{department}%")
            )
        )
        
    if search:
        query = query.outerjoin(User, Ticket.requestor_id == User.id).filter(
            or_(
                Ticket.subject.ilike(f"%{search}%"),
                Ticket.description.ilike(f"%{search}%"),
                cast(Ticket.id, String).ilike(f"%{search}%"),
                User.full_name.ilike(f"%{search}%")
            )
        )

    query = query.offset(skip)
    if limit > 0:
        query = query.limit(limit)
        
    result = await db.execute(query)
    tickets = result.unique().scalars().all()
        
    for t in tickets:
        # Map relationship data to the flat fields used by the schema
        if t.requestor:
            t.requestor_name = t.requestor.full_name
            t.requestor_department = t.requestor.department
            t.requestor_email = t.requestor.email
        
        if t.assigned_to:
            t.assigned_to_name = t.assigned_to.full_name
            t.assigned_to_email = t.assigned_to.email
            t.assigned_to_role = t.assigned_to.role
            
    return tickets

async def get_ticket(db: AsyncSession, ticket_id: UUID):
    """Get a ticket by ID with enriched relationships."""
    query = select(Ticket).options(
        joinedload(Ticket.requestor),
        joinedload(Ticket.assigned_to)
    ).filter(Ticket.id == ticket_id)
    
    result = await db.execute(query)
    t = result.unique().scalar_one_or_none()
    
    if t:
        if t.requestor:
            t.requestor_name = t.requestor.full_name
            t.requestor_department = t.requestor.department
            t.requestor_email = t.requestor.email
        
        if t.assigned_to:
            t.assigned_to_name = t.assigned_to.full_name
            t.assigned_to_email = t.assigned_to.email
            t.assigned_to_role = t.assigned_to.role
            
    return t

async def create_ticket(db: AsyncSession, ticket: TicketCreate):
    """
    [DEPRECATED] Use create_ticket_v2 which derives identity from JWT.
    """
    return await create_ticket_v2(db, ticket, requestor_id=getattr(ticket, 'requestor_id', None))

_ticket_creation_locks = {}

async def create_ticket_v2(db: AsyncSession, ticket: TicketCreate, requestor_id: UUID):
    """
    Create a new ticket with explicit requestor_id (derived from JWT).
    Includes a duplicate check using an asyncio.Lock to prevent multiple identical tickets within 60 seconds.
    """
    requestor_id_str = str(requestor_id)
    if requestor_id_str not in _ticket_creation_locks:
        _ticket_creation_locks[requestor_id_str] = asyncio.Lock()
        
    async with _ticket_creation_locks[requestor_id_str]:
        # 1. Check for recent identical ticket (Duplicate Prevention)
        # Check if a ticket with same subject, description, and requestor exists created in the last 60 seconds
        since = datetime.now(timezone.utc) - timedelta(seconds=60)
        dup_query = select(Ticket).filter(
            Ticket.requestor_id == requestor_id,
            Ticket.subject == ticket.subject,
            Ticket.description == ticket.description,
            Ticket.created_at >= since
        )
        dup_result = await db.execute(dup_query)
        existing_ticket = dup_result.scalars().first()

        if existing_ticket:
            print(f"[DUPLICATE_PREVENTION] Returning existing ticket {existing_ticket.id} for user {requestor_id}")
            return existing_ticket

        # 2. Create new ticket if no duplicate found
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
