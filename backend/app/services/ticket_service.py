from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy import cast, String, or_
from ..models.models import Ticket, User, Task, AssignmentGroup
from ..schemas.ticket_schema import TicketCreate, TicketUpdate
import uuid
from uuid import UUID
from datetime import datetime, timedelta, timezone
from typing import Optional
import asyncio

async def get_tickets(db: AsyncSession, requestor_id: Optional[UUID] = None, department: Optional[str] = None, skip: int = 0, limit: int = 100, search: Optional[str] = None):
    """
    Get all tickets with user names, departments, and emails using ORM relationships.
    """
    # Use selectinload or joinedload for relationships
    query = select(Ticket).options(
        joinedload(Ticket.requestor),
        joinedload(Ticket.assigned_to),
        joinedload(Ticket.assignment_group),
        selectinload(Ticket.tasks).selectinload(Task.assigned_to),
        selectinload(Ticket.tasks).selectinload(Task.group),
        joinedload(Ticket.sla)
    ).order_by(Ticket.created_at.desc())
    
    if requestor_id:
        query = query.filter(Ticket.requestor_id == requestor_id)
    
    if department:
        query = query.outerjoin(Ticket.requestor).outerjoin(AssignmentGroup, Ticket.assignment_group_id == AssignmentGroup.id).filter(
            or_(
                User.department.ilike(f"%{department}%"),
                User.domain.ilike(f"%{department}%"),
                AssignmentGroup.department.ilike(f"%{department}%")
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
            
        if t.assignment_group:
            t.assignment_group_name = t.assignment_group.name
            t.assignment_group_department = t.assignment_group.department

        if t.sla:
            t.sla_deadline = t.sla.resolution_deadline

        # Enrich tasks with names
        for task in t.tasks:
            if task.assigned_to:
                task.assigned_to_name = task.assigned_to.full_name
            if task.group:
                task.group_name = task.group.name
            
    return tickets

async def get_ticket(db: AsyncSession, ticket_id: UUID):
    """Get a ticket by ID with enriched relationships."""
    query = select(Ticket).options(
        joinedload(Ticket.requestor),
        joinedload(Ticket.assigned_to),
        joinedload(Ticket.assignment_group),
        selectinload(Ticket.tasks).selectinload(Task.assigned_to),
        selectinload(Ticket.tasks).selectinload(Task.group),
        joinedload(Ticket.sla)
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

        if t.assignment_group:
            t.assignment_group_name = t.assignment_group.name
            t.assignment_group_department = t.assignment_group.department

        if t.sla:
            print(f"DEBUG: Found SLA for ticket {t.id}: {t.sla.resolution_deadline}")
            t.sla_deadline = t.sla.resolution_deadline
        else:
            print(f"DEBUG: No SLA found for ticket {t.id}")

        for task in t.tasks:
            if task.assigned_to:
                task.assigned_to_name = task.assigned_to.full_name
            if task.group:
                task.group_name = task.group.name
            
    return t

async def create_ticket(db: AsyncSession, ticket: TicketCreate):
    """
    [DEPRECATED] Use create_ticket_v2 which derives identity from JWT.
    """
    requestor_id = getattr(ticket, 'requestor_id', None)
    if not requestor_id:
        # Fallback for deprecated use if needed, but create_ticket_v2 requires a UUID
        raise ValueError("requestor_id must be provided")
    return await create_ticket_v2(db, ticket, requestor_id=requestor_id)

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
            subject=ticket.subject,
            description=ticket.description,
            priority=ticket.priority,
            category=ticket.category,
            assignment_group_id=ticket.assignment_group_id,
            related_asset_id=ticket.related_asset_id,
            tasks=[]
        )
        db.add(db_ticket)
        await db.commit()
        return await get_ticket(db, db_ticket.id)

async def update_ticket(db: AsyncSession, ticket_id: UUID, ticket_update: TicketUpdate):
    """Update an existing ticket (Asynchronous)."""
    db_ticket = await get_ticket(db, ticket_id)
    if not db_ticket:
        return None
    
    old_priority = db_ticket.priority
    old_group_id = db_ticket.assignment_group_id
    
    update_data = ticket_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_ticket, key, value)
    
    # 1. Clear assigned_to if group changes
    if "assignment_group_id" in update_data and update_data["assignment_group_id"] != old_group_id:
        db_ticket.assigned_to_id = None
        
    await db.commit()
    
    # 2. Recalculate SLA if priority changes
    if "priority" in update_data and update_data["priority"] != old_priority:
        from .automation_service import AutomationService
        await AutomationService.initialize_ticket_sla(db, ticket_id)
        
    return await get_ticket(db, ticket_id)

async def delete_ticket(db: AsyncSession, ticket_id: UUID):
    """Delete a ticket (Asynchronous)."""
    db_ticket = await get_ticket(db, ticket_id)
    if db_ticket:
        await db.delete(db_ticket)
        await db.commit()
        return True
    return False
