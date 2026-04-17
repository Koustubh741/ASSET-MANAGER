from __future__ import annotations
from typing import TYPE_CHECKING, List, Optional, Union, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload, selectinload
from sqlalchemy import cast, String, or_, and_, func, extract
from ..models.models import Ticket, User, Task, AssignmentGroup
from ..schemas.ticket_schema import TicketCreate, TicketUpdate
import uuid
from uuid import UUID
from ..utils.uuid_gen import get_uuid
from datetime import datetime, timedelta, timezone
import asyncio
from ..utils.category_utils import normalize_category
from .automation_service import AutomationService # For SLA logic
from ..models.automation import TicketSLA, SLAPolicy # For SLA models

if TYPE_CHECKING:
    from ..models.models import Ticket, User, Task, AssignmentGroup
    from ..schemas.ticket_schema import TicketCreate, TicketUpdate

def _populate_ticket_data(t: Ticket) -> Dict:
    """
    Populate ticket data as a dictionary for safe async serialization.
    Decouples the response generation from the SQLAlchemy session.
    """
    if not t: return {}
    
    # Base fields from model
    data = {
        "id": t.id,
        "display_id": t.display_id or str(t.id)[:8].upper(),
        "subject": t.subject,
        "description": t.description,
        "status": (t.status or "Open").title(),
        "priority": (t.priority or "Medium").title(),
        "category": t.category,
        "subcategory": t.subcategory,
        "requestor_id": t.requestor_id,
        "assigned_to_id": t.assigned_to_id,
        "assignment_group_id": t.assignment_group_id,
        "target_department_id": t.target_department_id,
        "related_asset_id": t.related_asset_id,
        "resolution_notes": t.resolution_notes,
        "resolution_checklist": t.resolution_checklist,
        "resolution_percentage": t.resolution_percentage,
        "timeline": t.timeline,
        "created_at": t.created_at,
        "updated_at": t.updated_at
    }
    
    # 1. Map relationships to flat fields (Safe access via selectin)
    if t.requestor:
        data["requestor_name"] = t.requestor.full_name
        data["requestor_email"] = t.requestor.email
        data["requestor_department"] = t.requestor.dept_obj.name if t.requestor.dept_obj else getattr(t.requestor, 'department', "N/A")
    else:
        data["requestor_name"] = "System"
        data["requestor_department"] = "N/A"
    
    if t.assigned_to:
        data["assigned_to_name"] = t.assigned_to.full_name
        data["assigned_to_email"] = t.assigned_to.email
        data["assigned_to_role"] = t.assigned_to.role
    
    if t.assignment_group:
        data["assignment_group_name"] = t.assignment_group.name
        data["assignment_group_department"] = t.assignment_group.dept_obj.name if getattr(t.assignment_group, 'dept_obj', None) else None

    if t.target_department:
        data["target_department_name"] = t.target_department.name

    if t.sla:
        data["sla_deadline"] = t.sla.resolution_deadline
        data["sla_response_deadline"] = t.sla.response_deadline
        data["sla_resolution_deadline"] = t.sla.resolution_deadline
        data["sla_response_status"] = t.sla.response_status
        data["sla_resolution_status"] = t.sla.resolution_status
        
    # Task population (nested)
    if t.tasks:
        data["tasks"] = []
        for task in t.tasks:
            task_data = {
                "id": task.id,
                "ticket_id": task.ticket_id,
                "subject": task.subject,
                "description": task.description,
                "status": task.status,
                "priority": task.priority,
                "assigned_to_id": task.assigned_to_id,
                "group_id": task.group_id,
                "due_date": task.due_date,
                "completed_at": task.completed_at,
                "created_at": task.created_at,
                "updated_at": task.updated_at,
                "assigned_to_name": task.assigned_to.full_name if task.assigned_to else None,
                "group_name": task.group.name if task.group else None
            }
            data["tasks"].append(task_data)

    return data

async def get_tickets(
    db: AsyncSession, 
    requestor_id: Optional[UUID] = None, 
    department: Optional[str] = None, 
    skip: int = 0, 
    limit: int = 100, 
    search: Optional[str] = None, 
    is_internal: Optional[bool] = None,
    include_unassigned: bool = False
) -> tuple[List[Ticket], int]:
    """
    Get all tickets with pagination and total count (Asynchronous).
    Root Fix: Supports 100k user scalability.
    """
    # 1. Base Query with relationships
    query = select(Ticket).options(
        joinedload(Ticket.requestor),
        joinedload(Ticket.assigned_to),
        joinedload(Ticket.assignment_group),
        joinedload(Ticket.requestor).joinedload(User.dept_obj),
        selectinload(Ticket.tasks).selectinload(Task.assigned_to),
        selectinload(Ticket.tasks).selectinload(Task.group),
        joinedload(Ticket.sla),
        joinedload(Ticket.target_department)
    ).order_by(Ticket.created_at.desc())
    
    # Ensure core tables are joined for filtering
    query = query.outerjoin(User, Ticket.requestor_id == User.id).outerjoin(AssignmentGroup, Ticket.assignment_group_id == AssignmentGroup.id)

    # 2. Filtering Logic
    filter_clauses = []
    if requestor_id:
        filter_clauses.append(Ticket.requestor_id == requestor_id)
    
    if department:
        from ..models.models import Department
        dept_filter = or_(
            User.department_id.in_(
                select(Department.id).filter(Department.name.ilike(f"%{department}%"))
            ),
            User.domain.ilike(f"%{department}%"),
            AssignmentGroup.department_id.in_(
                select(Department.id).filter(Department.name.ilike(f"%{department}%"))
            )
        )
        if include_unassigned:
            # Support agents: see their dept tickets AND all platform-wide unassigned/open tickets
            filter_clauses.append(
                or_(
                    dept_filter,
                    Ticket.assigned_to_id == None
                )
            )
        else:
            filter_clauses.append(dept_filter)
        
    if search:
        filter_clauses.append(
            or_(
                Ticket.subject.ilike(f"%{search}%"),
                Ticket.description.ilike(f"%{search}%"),
                cast(Ticket.id, String).ilike(f"%{search}%"),
                User.full_name.ilike(f"%{search}%")
            )
        )
    
    if is_internal is not None:
        if is_internal:
            filter_clauses.append(and_(User.department_id != None, AssignmentGroup.department_id != None, User.department_id == AssignmentGroup.department_id))
        else:
            filter_clauses.append(or_(User.department_id != AssignmentGroup.department_id, User.department_id == None, AssignmentGroup.department_id == None))

    if filter_clauses:
        query = query.filter(*filter_clauses)

    # 3. Total Count Query (Optimized)
    count_query = select(func.count(Ticket.id)).outerjoin(User, Ticket.requestor_id == User.id).outerjoin(AssignmentGroup, Ticket.assignment_group_id == AssignmentGroup.id)
    if filter_clauses:
        count_query = count_query.filter(*filter_clauses)
    
    total = (await db.execute(count_query)).scalar() or 0

    # 4. Pagination
    query = query.offset(skip)
    if limit > 0:
        query = query.limit(limit)
        
    result = await db.execute(query)
    tickets = result.unique().scalars().all()
        
    return [_populate_ticket_data(t) for t in tickets], total


async def get_ticket(db: AsyncSession, ticket_id: UUID) -> Optional[Ticket]:
    """Get a ticket by ID with enriched relationships."""
    query = select(Ticket).options(
        joinedload(Ticket.requestor),
        joinedload(Ticket.assigned_to),
        joinedload(Ticket.assignment_group),
        selectinload(Ticket.tasks).selectinload(Task.assigned_to),
        selectinload(Ticket.tasks).selectinload(Task.group),
        joinedload(Ticket.sla),
        joinedload(Ticket.target_department)
    ).filter(Ticket.id == ticket_id)
    
    result = await db.execute(query)
    t = result.unique().scalar_one_or_none()
    
    return _populate_ticket_data(t) if t else None
            
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

async def create_ticket_v2(db: AsyncSession, ticket: TicketCreate, requestor_id: UUID, override_status: Optional[str] = None) -> Ticket:
    """
    Create a new ticket with explicit requestor_id (derived from JWT or automation).
    Includes a duplicate check, Smart ID generation, and mandatory SLA/Routing hooks.
    This is the centralized FACTORY for all ticket creation in the platform.
    """
    requestor_id_str = str(requestor_id)
    if requestor_id_str not in _ticket_creation_locks:
        _ticket_creation_locks[requestor_id_str] = asyncio.Lock()
        
    async with _ticket_creation_locks[requestor_id_str]:
        # 1. Check for recent identical ticket (Duplicate Prevention)
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
            return await get_ticket(db, existing_ticket.id)

        # 2. Generate Smart ID
        from .smart_id_service import SmartIDService
        from .user_service import get_user
        from .asset_service import get_asset_by_id
        
        user = await get_user(db, requestor_id)
        asset = None
        if ticket.related_asset_id:
            try:
                asset = await get_asset_by_id(db, ticket.related_asset_id)
            except:
                pass

        ticket_uuid = get_uuid()
        display_id = SmartIDService.generate(
            dept=(user.dept_obj.name if user.dept_obj else user.department) if user else "GEN",
            priority=ticket.priority,
            category=ticket.category,
            asset_type=asset.type if asset else None,
            created_at=datetime.now(timezone.utc),
            ticket_uuid=ticket_uuid
        )

        # 3. Create new ticket
        db_ticket = Ticket(
            id=ticket_uuid,
            display_id=display_id,
            requestor_id=requestor_id,
            subject=ticket.subject,
            description=ticket.description,
            priority=ticket.priority,
            # Normalize category if possible, fallback to provided
            category=normalize_category(ticket.category, ticket.subject, ticket.description) if ticket.category else "Other",
            subcategory=ticket.subcategory,
            assignment_group_id=ticket.assignment_group_id,
            target_department_id=ticket.target_department_id,
            related_asset_id=ticket.related_asset_id,
            assigned_to_id=ticket.assigned_to_id,
            status=override_status if override_status else ("Assigned" if ticket.assigned_to_id else "Open"),
            created_at=datetime.now(timezone.utc),
            tasks=[],
            timeline=[{
                "action": "CREATED",
                "comment": f"Ticket created via {'Automation' if not user else 'Portal'}.",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "byRole": user.role if user else "SYSTEM",
                "byUser": user.full_name if user else "System Process"
            }]
        )
        db.add(db_ticket)
        await db.commit()

        # 4. Mandatory Automation Hooks (The Root Fix)
        try:
            from .automation_service import AutomationService
            # Apply routing rules first (updates group/assignee)
            await AutomationService.apply_routing_rules(db, db_ticket.id)
            # Initialize SLA based on final priority/category
            await AutomationService.initialize_ticket_sla(db, db_ticket.id)
            await db.commit() 
        except Exception as e:
            print(f"[ERROR] Automation hooks failed for {db_ticket.id}: {e}")

        return db_ticket

async def update_ticket(db: AsyncSession, ticket_id: UUID, ticket_update: TicketUpdate) -> Optional[Ticket]:
    """Update an existing ticket (Asynchronous)."""
    db_ticket = await get_ticket(db, ticket_id)
    if not db_ticket:
        return None
    
    old_priority = db_ticket.priority
    old_group_id = db_ticket.assignment_group_id
    
    update_data = ticket_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key == "category":
            # Note: Using existing subject/desc if not in update_data
            subj = update_data.get("subject", db_ticket.subject)
            desc = update_data.get("description", db_ticket.description)
            value = normalize_category(value, subj, desc)
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

async def delete_ticket(db: AsyncSession, ticket_id: UUID) -> bool:
    """Delete a ticket (Asynchronous)."""
    db_ticket = await get_ticket(db, ticket_id)
    if db_ticket:
        await db.delete(db_ticket)
        await db.commit()
        return True

