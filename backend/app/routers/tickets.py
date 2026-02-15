from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from uuid import UUID
from ..database.database import get_db
from ..schemas.ticket_schema import TicketCreate, TicketUpdate, TicketResponse, ITDiagnosisRequest, ResolutionUpdate
from ..services import ticket_service
from ..services import asset_request_service
from ..schemas.user_schema import UserResponse
from ..models.models import Asset, ByodDevice
from ..utils.auth_utils import get_current_user
from datetime import datetime

router = APIRouter(
    prefix="/tickets",
    tags=["tickets"]
)


async def verify_it_management(user: UserResponse) -> UserResponse:
    """
    Verify that the user is IT management (role=IT_MANAGEMENT) and active.
    """
    if user.role != "IT_MANAGEMENT" and user.role != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Unauthorized: Requires IT_MANAGEMENT or ADMIN role",
        )
    if user.status != "ACTIVE":
        raise HTTPException(
            status_code=403,
            detail="User account is not active",
        )
    return user


@router.post("/", response_model=TicketResponse)
async def create_ticket(
    ticket: TicketCreate, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new ticket (Asynchronous)."""
    # Security: Derive requestor_id from JWT
    requestor_id = current_user.id
    
    if ticket.related_asset_id:
        res_asset = await db.execute(select(Asset).filter(Asset.id == ticket.related_asset_id))
        asset = res_asset.scalars().first()
        if not asset:
            res_byod = await db.execute(select(ByodDevice).filter(ByodDevice.id == ticket.related_asset_id))
            byod = res_byod.scalars().first()
            if not byod:
                raise HTTPException(
                    status_code=400,
                    detail="related_asset_id must reference a valid asset or BYOD device",
                )
    return await ticket_service.create_ticket_v2(db=db, ticket=ticket, requestor_id=requestor_id)

@router.get("/", response_model=List[TicketResponse])
async def read_tickets(
    skip: int = 0, 
    limit: int = 100, 
    department: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Read tickets (Asynchronous). If END_USER, only see own tickets. Managers see their department."""
    effective_requestor_id = None
    
    # System Admin and IT Management see all. 
    # Regular End Users see only their own.
    # Managers see their own department.
    if current_user.role == "END_USER" and current_user.position != "MANAGER":
        effective_requestor_id = current_user.id
    
    if current_user.position == "MANAGER" and current_user.role not in ["ADMIN", "SYSTEM_ADMIN", "IT_MANAGEMENT"]:
        # Reinforce scoping for managers
        if not department:
            department = current_user.department or current_user.domain
        
    return await ticket_service.get_tickets(db, requestor_id=effective_requestor_id, department=department, skip=skip, limit=limit)

@router.get("/{ticket_id}", response_model=TicketResponse)
async def read_ticket(
    ticket_id: UUID, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Read a specific ticket (Asynchronous)."""
    db_ticket = await ticket_service.get_ticket(db, ticket_id=ticket_id)
    if db_ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    # Security Root Fix: Authorization check
    if current_user.role == "END_USER" and db_ticket.requestor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to view this ticket")
        
    return db_ticket

@router.patch("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: UUID, 
    ticket_update: TicketUpdate, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update a ticket (Asynchronous)."""
    # Fetch the ticket to verify ownership and permissions
    db_ticket = await ticket_service.get_ticket(db, ticket_id=ticket_id)
    if db_ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # RBAC: END_USER can only update their own tickets and specific fields
    if current_user.role == "END_USER":
        if db_ticket.requestor_id != current_user.id:
            raise HTTPException(
                status_code=403, 
                detail="Unauthorized: You can only update your own tickets"
            )
        
        # Restrict END_USER to only updating subject and description
        if ticket_update.status is not None or ticket_update.priority is not None or ticket_update.assigned_to_id is not None:
            raise HTTPException(
                status_code=403,
                detail="Unauthorized: End users cannot modify status, priority, or assignment"
            )
    
    # Proceed with update
    updated_ticket = await ticket_service.update_ticket(db, ticket_id=ticket_id, ticket_update=ticket_update)
    return updated_ticket


@router.post("/{ticket_id}/it/diagnose", response_model=TicketResponse)
async def it_diagnose_ticket(
    ticket_id: UUID,
    payload: ITDiagnosisRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """IT Management diagnosis for tickets (Asynchronous)."""
    reviewer = await verify_it_management(current_user)

    db_ticket = await ticket_service.get_ticket(db, ticket_id)
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if not db_ticket.related_asset_id:
        raise HTTPException(
            status_code=400,
            detail="Ticket is not linked to any asset or BYOD device",
        )

    # Try to resolve as company asset
    res_asset = await db.execute(select(Asset).filter(Asset.id == db_ticket.related_asset_id))
    asset = res_asset.scalars().first()
    if asset:
        if payload.outcome == "repair":
            asset.status = "Repair"
            db_ticket.status = "IN_PROGRESS"
        elif payload.outcome == "secure":
            db_ticket.status = "RESOLVED"
            
        await db.commit()
        await db.refresh(db_ticket)
        return db_ticket

    # Otherwise treat as BYOD device
    res_byod = await db.execute(select(ByodDevice).filter(ByodDevice.id == db_ticket.related_asset_id))
    byod = res_byod.scalars().first()
    if not byod:
        raise HTTPException(
            status_code=400,
            detail="related_asset_id does not match any asset or BYOD device",
        )

    if payload.outcome == "secure":
        byod.compliance_status = "MDM_ENFORCED"
        db_ticket.status = "RESOLVED"
    elif payload.outcome == "repair":
        byod.compliance_status = "NON_COMPLIANT"
        db_ticket.status = "IN_PROGRESS"
        
    await db.commit()
    await db.refresh(db_ticket)
    return db_ticket

@router.post("/{ticket_id}/acknowledge", response_model=TicketResponse)
async def acknowledge_ticket(
    ticket_id: UUID, 
    payload: ITDiagnosisRequest, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """IT Management acknowledges the ticket (Asynchronous)."""
    reviewer = await verify_it_management(current_user)
    
    db_ticket = await ticket_service.get_ticket(db, ticket_id)
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    if db_ticket.status and db_ticket.status.upper() == "OPEN":
        db_ticket.status = "IN_PROGRESS"
        
        new_event = {
            "action": "ACKNOWLEDGED",
            "byRole": "IT_MANAGEMENT",
            "byUser": reviewer.full_name,
            "timestamp": datetime.utcnow().isoformat(),
            "comment": payload.notes or "Ticket acknowledged and moved to Investigation"
        }
        
        current_timeline = list(db_ticket.timeline) if db_ticket.timeline else []
        current_timeline.append(new_event)
        db_ticket.timeline = current_timeline
        
        if payload.notes:
            db_ticket.resolution_notes = payload.notes

    await db.commit()
    await db.refresh(db_ticket)
    return db_ticket

@router.post("/{ticket_id}/progress", response_model=TicketResponse)
async def update_ticket_progress(
    ticket_id: UUID, 
    payload: ResolutionUpdate, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update resolution progress (Asynchronous)."""
    reviewer = await verify_it_management(current_user)
    
    db_ticket = await ticket_service.get_ticket(db, ticket_id)
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    db_ticket.resolution_notes = payload.notes
    db_ticket.resolution_checklist = payload.checklist
    db_ticket.resolution_percentage = payload.percentage
    
    if db_ticket.status != "IN_PROGRESS" and db_ticket.status != "RESOLVED":
        db_ticket.status = "IN_PROGRESS"

    new_event = {
        "action": "PROGRESS_UPDATE",
        "byRole": "IT_MANAGEMENT",
        "byUser": reviewer.full_name,
        "timestamp": datetime.utcnow().isoformat(),
        "comment": f"Resolution progress updated to {payload.percentage}%"
    }
    current_timeline = list(db_ticket.timeline) if db_ticket.timeline else []
    current_timeline.append(new_event)
    db_ticket.timeline = current_timeline

    await db.commit()
    await db.refresh(db_ticket)
    return db_ticket

@router.post("/{ticket_id}/resolve", response_model=TicketResponse)
async def resolve_ticket(
    ticket_id: UUID, 
    payload: ResolutionUpdate, 
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """IT Management resolves the ticket (Asynchronous)."""
    reviewer = await verify_it_management(current_user)
    
    db_ticket = await ticket_service.get_ticket(db, ticket_id)
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    db_ticket.resolution_notes = payload.notes
    db_ticket.resolution_checklist = payload.checklist
    db_ticket.resolution_percentage = 100.0
    
    db_ticket.status = "RESOLVED"

    new_event = {
        "action": "RESOLVED",
        "byRole": "IT_MANAGEMENT",
        "byUser": reviewer.full_name,
        "timestamp": datetime.utcnow().isoformat(),
        "comment": payload.notes or "Ticket has been marked as Resolved"
    }
    current_timeline = list(db_ticket.timeline) if db_ticket.timeline else []
    current_timeline.append(new_event)
    db_ticket.timeline = current_timeline
    
    await db.commit()
    await db.refresh(db_ticket)
    return db_ticket
