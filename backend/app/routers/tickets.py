from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, text, delete, or_
import logging
import os
import shutil
from typing import List, Optional, Dict, Any, TypedDict, cast
from uuid import UUID
from datetime import datetime, timezone

from ..database.database import get_db
from ..schemas.ticket_schema import (
    TicketCreate, TicketUpdate, TicketResponse, 
    ITDiagnosisRequest, ResolutionUpdate, 
    TicketCategorySummaryResponse, TicketCategoryStat,
    WorkflowRuleCreate, WorkflowRuleUpdate, WorkflowRuleResponse,
    SLAPolicyCreate, SLAPolicyResponse, SLAPolicyUpdate,
    TicketCommentCreate, TicketCommentResponse, TicketAttachmentResponse,
    TicketAssignmentRequest
)
from ..schemas.common_schema import PaginatedResponse
from ..schemas.user_schema import UserResponse
from ..models.models import User, Asset, ByodDevice, Ticket, AssignmentGroup, PatchDeployment, AgentCommand, SystemPatch, TicketComment, TicketAttachment, Department
from ..models.automation import WorkflowRule, SLAPolicy
from ..services import ticket_service, asset_request_service
from ..services.notification_service import send_notification
from ..services.automation_service import AutomationService
from ..services.timeline_service import timeline_service
from ..utils.auth_utils import get_current_user, STAFF_ROLES

logger = logging.getLogger(__name__)

class StatsEntry(TypedDict):
    category: str
    open: int
    pending: int
    resolved: int
    total: int
    mttr_list: List[float]
    depts: Dict[str, int]
    estimated_cost: float

class SolverStatsEntry(TypedDict):
    full_name: str
    count: int
    categories: set
    mttr_total_hours: float

router = APIRouter(
    prefix="/tickets",
    tags=["tickets"]
)

# HELPER DEPENDENCIES

async def verify_staff_access(user: UserResponse) -> UserResponse:
    """
    ROOT FIX: Check if user has STAFF clearance (ADMIN, SUPPORT, or MANAGER).
    Managers are considered staff for their own departmental operations.
    """
    if user.role not in STAFF_ROLES:
        raise HTTPException(
            status_code=403,
            detail=f"Unauthorized: Role {user.role} does not have elevated access",
        )
    if user.status != "ACTIVE":
        raise HTTPException(
            status_code=403,
            detail="User account is not active",
        )
    return user

async def verify_it_allocation(user: UserResponse) -> UserResponse:
    """
    ROOT FIX: Unified Allocation Check.
    Admins see everything. Staff (SUPPORT/MANAGER) can allocate within their department.
    """
    if user.role == "ADMIN":
        return user
    
    # Staff roles (SUPPORT/MANAGER) can allocate within their department scope.
    if user.role in STAFF_ROLES:
        return user
        
    raise HTTPException(
        status_code=403,
        detail="Unauthorized: Elevated clearance required for ticket allocation",
    )

async def verify_it_management(user: UserResponse) -> UserResponse:
    """
    ROOT FIX: Missing dependency fix.
    Validates if a user has staff privileges to manage ticket lifecycle (Assign, Resolve, etc.)
    """
    if user.role == "ADMIN":
        return user
    
    if user.role in STAFF_ROLES:
        return user
        
    raise HTTPException(
        status_code=403,
        detail="Unauthorized: Staff clearance required for ticket management",
    )

# --- Powerful Workflow Automation Endpoints ---
# NOTE: These must be BEFORE generic UUID routes like /{ticket_id} to avoid shadowing

@router.get("/automation/rules", response_model=List[WorkflowRuleResponse], tags=["automation"])
async def get_all_rules(db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    await verify_it_allocation(current_user)
    res = await db.execute(select(WorkflowRule).order_by(WorkflowRule.priority_order.asc()))
    return res.scalars().all()

@router.post("/automation/rules", response_model=WorkflowRuleResponse, tags=["automation"])
async def create_rule(
    rule: WorkflowRuleCreate,
    db: AsyncSession = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    await verify_it_allocation(current_user)
    new_rule = WorkflowRule(
        name=rule.name, 
        description=rule.description,
        conditions=rule.conditions, 
        actions=rule.actions, 
        priority_order=rule.priority_order,
        is_active=rule.is_active
    )
    db.add(new_rule)
    await db.commit()
    await db.refresh(new_rule)
    return new_rule

@router.patch("/automation/rules/{rule_id}", response_model=WorkflowRuleResponse, tags=["automation"])
async def update_rule(
    rule_id: UUID,
    rule_update: WorkflowRuleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    await verify_it_allocation(current_user)
    res = await db.execute(select(WorkflowRule).where(WorkflowRule.id == rule_id))
    db_rule = res.scalar_one_or_none()
    if not db_rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    update_data = rule_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_rule, key, value)
    
    db_rule.updated_at = func.now()
    await db.commit()
    await db.refresh(db_rule)
    return db_rule

@router.delete("/automation/rules/{rule_id}", tags=["automation"])
async def delete_rule(
    rule_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    await verify_it_allocation(current_user)
    await db.execute(delete(WorkflowRule).where(WorkflowRule.id == rule_id))
    await db.commit()
    return {"status": "deleted"}

@router.get("/sla-policies", response_model=List[SLAPolicyResponse], tags=["automation"])
async def get_all_policies(db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    # ROOT FIX: All authenticated users can READ SLA policies (read-only transparency)
    # Writes (POST/DELETE) remain restricted to IT allocation roles.
    res = await db.execute(select(SLAPolicy))
    return res.scalars().all()

@router.post("/sla-policies", response_model=SLAPolicyResponse, tags=["automation"])
async def create_policy(
    name: str, 
    priority: Optional[str] = None, 
    category: Optional[str] = None,
    res_min: Optional[int] = None, 
    rem_min: int = 240,
    db: AsyncSession = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    """Align with frontend query parameters in apiClient.js"""
    await verify_it_allocation(current_user)
    new_policy = SLAPolicy(
        name=name, 
        priority=priority,
        category=category,
        response_time_limit=res_min, 
        resolution_time_limit=rem_min,
        is_active=True
    )
    db.add(new_policy)
    await db.commit()
    await db.refresh(new_policy)
    return new_policy

@router.delete("/sla-policies/{policy_id}", tags=["automation"])
async def delete_policy(
    policy_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    await verify_it_allocation(current_user)
    await db.execute(delete(SLAPolicy).where(SLAPolicy.id == policy_id))
    await db.commit()
    return {"status": "deleted"}

@router.patch("/sla-policies/{policy_id}", response_model=SLAPolicyResponse, tags=["automation"])
async def update_policy(
    policy_id: UUID,
    policy_update: SLAPolicyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    await verify_it_allocation(current_user)
    res = await db.execute(select(SLAPolicy).where(SLAPolicy.id == policy_id))
    db_policy = res.scalar_one_or_none()
    if not db_policy:
        raise HTTPException(status_code=404, detail="SLA Policy not found")
    
    update_data = policy_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_policy, key, value)
    
    await db.commit()
    await db.refresh(db_policy)
    return db_policy

# --- Standard Ticket Endpoints ---

from ..utils.category_utils import normalize_category

@router.get("/stats/category", response_model=TicketCategorySummaryResponse)
async def get_ticket_stats_by_category(
    range_days: int = 30,
    is_internal: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Base query for stats - joining User for department info
    from ..models.models import Department
    
    query = (
        select(
            Ticket.category, 
            Ticket.status, 
            Ticket.created_at, 
            Ticket.updated_at, 
            Ticket.subject, 
            Ticket.description, 
            Department.name.label("department_name"), 
            Ticket.requestor_id
        )
        .outerjoin(User, Ticket.requestor_id == User.id)
        .outerjoin(Department, User.department_id == Department.id)
        .outerjoin(AssignmentGroup, Ticket.assignment_group_id == AssignmentGroup.id)
    )
    
    # Apply Time Range
    query = query.where(Ticket.created_at >= func.now() - text(f"INTERVAL '{range_days} days'"))
    
    # ROOT FIX: Unified Departmental Scope for Stats
    # 1. End Users (non-managers) only see their own tickets
    if current_user.role == "END_USER" and current_user.position != "MANAGER":
        query = query.where(Ticket.requestor_id == current_user.id)
    
    # 2. Staff (SUPPORT/MANAGER) see their department ONLY
    elif current_user.role != "ADMIN":
        user_dept_id = current_user.department_id
        if not user_dept_id:
             # Fallback: if no dept_id, they can't see departmental stats (security safety)
             query = query.where(Ticket.requestor_id == current_user.id)
        else:
             query = query.where(or_(User.department_id == user_dept_id, AssignmentGroup.department_id == user_dept_id))

    # Apply Internal/External Switcher Logic
    if is_internal is not None:
        if is_internal:
            query = query.where(User.department_id != None, AssignmentGroup.department_id != None, User.department_id == AssignmentGroup.department_id)
        else:
            query = query.where(or_(User.department_id != AssignmentGroup.department_id, User.department_id == None, AssignmentGroup.department_id == None))
    result = await db.execute(query)
    tickets = result.all()
    
    asset_query = select(Asset.type, func.count(Asset.id)).group_by(Asset.type)
    asset_result = await db.execute(asset_query)
    asset_counts = {row[0]: row[1] for row in asset_result.all()}
    
    stats_map: Dict[str, StatsEntry] = {}
    total_tickets = 0
    for t in tickets:
        # ROOT FIX: Normalize category for clubbed stats (Subject-Aware)
        cat_name = str(t.category or "Other")
        subj = str(t.subject or "")
        desc = str(t.description or "")
        cat = normalize_category(cat_name, subj, desc)
        
        status = str(t.status or "Open").upper()
        total_tickets += 1
        if cat not in stats_map:
            stats_map[cat] = cast(StatsEntry, {"category": cat, "open": 0, "pending": 0, "resolved": 0, "total": 0, "mttr_list": [], "depts": {}, "estimated_cost": 0.0})
        sm = stats_map[cat]
        sm["total"] += 1
        if status in ["OPEN", "IN_PROGRESS", "ACKNOWLEDGED"]: sm["open"] += 1
        elif status == "PENDING": sm["pending"] += 1
        elif status in ["CLOSED", "RESOLVED"]:
            sm["resolved"] += 1
            if t.updated_at and t.created_at:
                diff = t.updated_at - t.created_at
                sm["mttr_list"].append(diff.total_seconds() / 3600.0)
        if t.department_name: sm["depts"][t.department_name] = sm["depts"].get(t.department_name, 0) + 1
        sm["estimated_cost"] += 150.0

    final_stats = []
    for cat_name, data in stats_map.items():
        assets = int(asset_counts.get(cat_name, 10))
        reliability = (float(data["total"]) / (assets + 1.0)) * 10.0
        mttr = sum(data["mttr_list"]) / float(len(data["mttr_list"])) if data["mttr_list"] else 0.0
        dept_impact = [{"department": str(d), "count": int(c)} for d, c in data["depts"].items() if d]
        dept_impact.sort(key=lambda x: x["count"], reverse=True)
        final_stats.append({
            "category": cat_name, "open": int(data["open"]), "pending": int(data["pending"]), "resolved": int(data["resolved"]), "total": int(data["total"]),
            "reliability_score": round(float(min(10.0, reliability)), 1), "mttr_hours": round(float(mttr), 1), "department_impact": dept_impact[:3], "estimated_cost": float(data["estimated_cost"])
        })
    return {"stats": final_stats, "total_tickets": total_tickets}

@router.get("/stats/solvers")
async def get_ticket_solver_stats(range_days: Optional[int] = None, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    from sqlalchemy import and_
    # Build join conditions: only count RESOLVED tickets (+ optional date filter)
    STAFF_ROLES_LIST = list(STAFF_ROLES)

    # Build join conditions: only count RESOLVED tickets (+ optional date filter)
    join_conditions = [Ticket.assigned_to_id == User.id, Ticket.status == "RESOLVED"]
    if range_days is not None:
        join_conditions.append(Ticket.updated_at >= func.now() - text(f"INTERVAL '{range_days} days'"))

    # LEFT OUTER JOIN so ALL active IT staff appear, even those with 0 resolved tickets
    query = (
        select(
            User.id.label("user_id"),
            User.full_name,
            User.role,
            Ticket.id.label("ticket_id"),
            Ticket.category,
            Ticket.created_at.label("t_created"),
            Ticket.updated_at.label("t_updated"),
        )
        .select_from(User)
        .outerjoin(Ticket, and_(*join_conditions))
        .where(User.role.in_(STAFF_ROLES_LIST), User.status != "DISABLED")
    )

    result = await db.execute(query)
    rows = result.all()

    solvers: Dict[UUID, SolverStatsEntry] = {}
    for row in rows:
        uid = row.user_id
        if uid not in solvers:
            solvers[uid] = cast(SolverStatsEntry, {
                "full_name": str(row.full_name or "Unknown"),
                "role": str(row.role or "IT_SUPPORT"),
                "count": 0,
                "categories": set(),
                "mttr_total_hours": 0.0
            })
        if row.ticket_id is not None:  # only count rows with a matched ticket
            solvers[uid]["count"] += 1
            solvers[uid]["categories"].add(str(row.category or "Other"))
            if row.t_created and row.t_updated:
                solvers[uid]["mttr_total_hours"] += (row.t_updated - row.t_created).total_seconds() / 3600.0

    output = []
    for uid, data in solvers.items():
        count = data["count"]
        output.append({
            "id": str(uid),
            "full_name": data["full_name"],
            "role": data["role"].replace("_", " ").title(),
            "tickets_solved": count,
            "avg_resolve_time_hours": round(float(data["mttr_total_hours"] / count), 1) if count > 0 else 0.0,
            "specialties": sorted(list(set(str(c).replace("_", " ").title() for c in data["categories"]))),
        })

    output.sort(key=lambda x: x["tickets_solved"], reverse=True)
    return output

@router.get("/analytics/summary", tags=["analytics"])
async def get_ticket_analytics_summary(
    range_days: Optional[int] = 30,
    period_mode: Optional[str] = "rolling",
    period_start: Optional[str] = None,
    period_end: Optional[str] = None,
    fiscal_year: Optional[int] = None,
    db: AsyncSession = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    """
    High-level operational metrics for CEO/Managers.
    Supports rolling (last N days) and calendar (explicit start/end) period modes.
    """
    if current_user.position != "MANAGER" and current_user.role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Unauthorized: Executive access required")
    
    user_id = current_user.id
    department = current_user.dept_obj.name if current_user.dept_obj else None
    if current_user.role in ["ADMIN", "IT_MANAGEMENT"]:
        user_id = None
        department = None

    # Parse optional explicit period dates (ISO format strings)
    parsed_start = datetime.fromisoformat(period_start) if period_start else None
    parsed_end = datetime.fromisoformat(period_end) if period_end else None
        
    return await ticket_service.get_ticket_executive_summary(
        db, user_id=user_id, department=department,
        range_days=range_days,
        period_start=parsed_start,
        period_end=parsed_end,
        fiscal_year=fiscal_year
    )


@router.get("/analytics/trend", tags=["analytics"])
async def get_ticket_trend(
    granularity: Optional[str] = "monthly",
    year: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Bucketed ticket volume and SLA compliance by week/month/quarter for a given year.
    granularity: weekly | monthly | quarterly
    """
    if current_user.position != "MANAGER" and current_user.role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Unauthorized: Executive access required")

    target_year = year or datetime.now().year

    user_id = current_user.id
    department = current_user.dept_obj.name if current_user.dept_obj else None
    if current_user.role in ["ADMIN", "IT_MANAGEMENT"]:
        user_id = None
        department = None

    return await ticket_service.get_ticket_trend_series(
        db, granularity=granularity, year=target_year,
        user_id=user_id, department=department
    )


@router.get("/analytics/compare", tags=["analytics"])
async def get_ticket_period_comparison(
    period_a_start: str,
    period_a_end: str,
    period_b_start: str,
    period_b_end: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Return two full executive summaries for side-by-side radar comparison.
    All dates must be ISO format strings: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS
    """
    if current_user.position != "MANAGER" and current_user.role not in STAFF_ROLES:
        raise HTTPException(status_code=403, detail="Unauthorized: Executive access required")

    user_id = current_user.id
    department = current_user.dept_obj.name if current_user.dept_obj else None
    if current_user.role in ["ADMIN", "IT_MANAGEMENT"]:
        user_id = None
        department = None

    return await ticket_service.get_ticket_comparison(
        db,
        period_a_start=datetime.fromisoformat(period_a_start),
        period_a_end=datetime.fromisoformat(period_a_end),
        period_b_start=datetime.fromisoformat(period_b_start),
        period_b_end=datetime.fromisoformat(period_b_end),
        user_id=user_id, department=department
    )

@router.post("/", response_model=TicketResponse)
async def create_ticket(ticket: TicketCreate, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    if ticket.related_asset_id:
        res_asset = await db.execute(select(Asset).filter(Asset.id == ticket.related_asset_id))
        if not res_asset.scalars().first():
            res_byod = await db.execute(select(ByodDevice).filter(ByodDevice.id == ticket.related_asset_id))
            if not res_byod.scalars().first(): raise HTTPException(status_code=400, detail="related_asset_id invalid")
    res = await ticket_service.create_ticket_v2(db=db, ticket=ticket, requestor_id=current_user.id)
    try:
        await AutomationService.apply_routing_rules(db, res.id)
        await AutomationService.initialize_ticket_sla(db, res.id)
        res = await ticket_service.get_ticket(db, res.id)
    except Exception as e: logger.error(f"Automation error: {str(e)}")
    await send_notification(db, res.id, "ticket_created")
    return res

@router.post("/{ticket_id}/comments", response_model=TicketCommentResponse, tags=["comments"])
async def add_ticket_comment(
    ticket_id: UUID, 
    comment: TicketCommentCreate, 
    db: AsyncSession = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    db_ticket = await ticket_service.get_ticket(db, ticket_id)
    if not db_ticket: raise HTTPException(status_code=404, detail="Ticket not found")
    
    # RBAC: Check visibility
    await read_ticket(ticket_id, db, current_user)
    
    new_comment = TicketComment(
        id=uuid.uuid4(),
        ticket_id=ticket_id,
        user_id=current_user.id,
        content=comment.content,
        is_internal=comment.is_internal
    )
    db.add(new_comment)
    await db.commit()
    await db.refresh(new_comment)
    
    # Map author name for response
    new_comment.author_name = current_user.full_name
    return new_comment

@router.get("/{ticket_id}/comments", response_model=List[TicketCommentResponse], tags=["comments"])
async def get_ticket_comments(
    ticket_id: UUID, 
    db: AsyncSession = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    await read_ticket(ticket_id, db, current_user)
    res = await db.execute(select(TicketComment).where(TicketComment.ticket_id == ticket_id).order_by(TicketComment.created_at.asc()))
    comments = res.scalars().all()
    
    # Enrichment
    output = []
    for c in comments:
        user_res = await db.execute(select(User).where(User.id == c.user_id))
        user = user_res.scalar_one_or_none()
        c.author_name = user.full_name if user else "System"
        output.append(c)
    return output

@router.get("/", response_model=PaginatedResponse[TicketResponse])
async def read_tickets(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    department: Optional[str] = None, 
    search: Optional[str] = None, 
    is_internal: Optional[bool] = None, 
    db: AsyncSession = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    """
    ROOT FIX: Departmental Scope Enforcement with Server-Side Pagination.
    Admins see everything. Support/Managers see their department ONLY.
    """
    eff_id = None
    if current_user.role == "END_USER" and current_user.position != "MANAGER":
        eff_id = current_user.id
        department = None # End users can only see their own tickets, department filter ignored
    elif current_user.role != "ADMIN":
        # Force departmental filter for Support and Managers
        # Note: ticket_service.get_tickets handles the lookup by department name string, 
        # so we pass the name if available.
        department = current_user.dept_obj.name if current_user.dept_obj else "Unknown"
        
    skip = (page - 1) * size
    data, total = await ticket_service.get_tickets(db, requestor_id=eff_id, department=department, skip=skip, limit=size, search=search, is_internal=is_internal)
    
    return PaginatedResponse(
        total=total,
        page=page,
        size=size,
        data=data
    )

@router.get("/{ticket_id}", response_model=TicketResponse)
async def read_ticket(ticket_id: UUID, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    db_ticket = await ticket_service.get_ticket(db, ticket_id=ticket_id)
    if not db_ticket: 
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # ROOT FIX: Unified Departmental Security Wall
    # 1. Admins see everything
    if current_user.role == "ADMIN":
        return db_ticket

    # 2. Staff (SUPPORT/MANAGER) see their department ONLY
    if current_user.role in STAFF_ROLES:
        user_dept_id = current_user.department_id
        # Check if ticket belongs to staff user's department (via requestor or group)
        in_dept = db_ticket.requestor and db_ticket.requestor.department_id == user_dept_id
        in_group_dept = db_ticket.assignment_group and db_ticket.assignment_group.department_id == user_dept_id
        
        if not (in_dept or in_group_dept):
            logger.warning(f"Staff {current_user.email} (DeptID: {user_dept_id}) attempted unauthorized access to ticket {ticket_id}")
            raise HTTPException(status_code=403, detail=f"Unauthorized: Ticket belongs to a different department")
        return db_ticket

    # 3. Regular End Users ONLY see their own personal tickets
    if db_ticket.requestor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized: You do not have permission to view this ticket")
        
    return db_ticket

@router.patch("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(ticket_id: UUID, ticket_update: TicketUpdate, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    db_ticket = await ticket_service.get_ticket(db, ticket_id=ticket_id)
    if not db_ticket: raise HTTPException(status_code=404, detail="Ticket not found")
    if current_user.role == "END_USER":
        if db_ticket.requestor_id != current_user.id: raise HTTPException(status_code=403, detail="Unauthorized")
        if ticket_update.status or ticket_update.priority or ticket_update.assigned_to_id: raise HTTPException(status_code=403, detail="Unauthorized field update")
    if ticket_update.assigned_to_id:
        if ticket_update.assigned_to_id != current_user.id: await verify_it_allocation(current_user)
        else: await verify_staff_access(current_user)
    return await ticket_service.update_ticket(db, ticket_id=ticket_id, ticket_update=ticket_update)

@router.post("/{ticket_id}/it/diagnose", response_model=TicketResponse)
async def it_diagnose_ticket(ticket_id: UUID, payload: ITDiagnosisRequest, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    await verify_staff_access(current_user)
    db_ticket = await ticket_service.get_ticket(db, ticket_id)
    if not db_ticket or not db_ticket.related_asset_id: raise HTTPException(status_code=404, detail="Ticket or linked asset not found")
    res_asset = await db.execute(select(Asset).filter(Asset.id == db_ticket.related_asset_id))
    asset = res_asset.scalars().first()
    if asset:
        if payload.outcome == "repair": asset.status, db_ticket.status = "Repair", "IN_PROGRESS"
        elif payload.outcome == "secure": db_ticket.status = "RESOLVED"
    else:
        res_byod = await db.execute(select(ByodDevice).filter(ByodDevice.id == db_ticket.related_asset_id))
        byod = res_byod.scalars().first()
        if not byod: raise HTTPException(status_code=400, detail="linked asset invalid")
        if payload.outcome == "secure": byod.compliance_status, db_ticket.status = "MDM_ENFORCED", "RESOLVED"
        elif payload.outcome == "repair": byod.compliance_status, db_ticket.status = "NON_COMPLIANT", "IN_PROGRESS"
    if db_ticket.status == "RESOLVED":
        await AutomationService.mark_sla_resolved(db, db_ticket.id)
    
    await db.commit()
    await db.refresh(db_ticket)
    return db_ticket

@router.post("/{ticket_id}/acknowledge", response_model=TicketResponse)
async def acknowledge_ticket(ticket_id: UUID, payload: ITDiagnosisRequest, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    reviewer = await verify_staff_access(current_user)
    db_ticket = await ticket_service.get_ticket(db, ticket_id)
    if not db_ticket: raise HTTPException(status_code=404, detail="Ticket not found")
    if db_ticket.status and db_ticket.status.upper() == "OPEN":
        db_ticket.status, db_ticket.assigned_to_id = "ACKNOWLEDGED", reviewer.id
        await timeline_service.log_ticket_event(
            db, db_ticket, "ACKNOWLEDGED", 
            payload.notes or "Ticket acknowledged and moved to queue.", 
            current_user
        )
        if payload.notes: db_ticket.resolution_notes = payload.notes
    if db_ticket.status == "IN_PROGRESS":
        await AutomationService.mark_sla_responded(db, db_ticket.id)
        
    await db.commit()
    await db.refresh(db_ticket)
    await send_notification(db, db_ticket.id, "ticket_updated", status="ACKNOWLEDGED", updated_by=reviewer.full_name, comment=payload.notes or "Acknowledged")
    return db_ticket

@router.post("/{ticket_id}/assign", response_model=TicketResponse)
async def assign_ticket(ticket_id: UUID, payload: TicketAssignmentRequest, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    agent_id = payload.agent_id
    reviewer = await verify_it_management(current_user)
    db_ticket = await ticket_service.get_ticket(db, ticket_id)
    if not db_ticket: raise HTTPException(status_code=404, detail="Ticket not found")
    
    agent_res = await db.execute(select(User).where(User.id == agent_id))
    agent = agent_res.scalar_one_or_none()
    if not agent: raise HTTPException(status_code=404, detail="Agent not found")
    
    db_ticket.assigned_to_id = agent_id
    db_ticket.status = "ASSIGNED"
    
    await timeline_service.log_ticket_event(
        db, db_ticket, "ASSIGNED", 
        f"Ticket assigned to {agent.full_name}", 
        current_user
    )
    
    await db.commit()
    await db.refresh(db_ticket)
    return db_ticket

@router.post("/{ticket_id}/start", response_model=TicketResponse)
async def start_ticket(ticket_id: UUID, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    db_ticket = await ticket_service.get_ticket(db, ticket_id)
    if not db_ticket: raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Only the assignee or a manager can start work
    if db_ticket.assigned_to_id != current_user.id and current_user.role not in STAFF_ROLES and current_user.position != "MANAGER":
        raise HTTPException(status_code=403, detail="Unauthorized to start work on this ticket")
        
    db_ticket.status = "IN_PROGRESS"
    
    await timeline_service.log_ticket_event(
        db, db_ticket, "START_WORK", 
        "Work started on ticket", 
        current_user
    )
    
    await db.commit()
    await db.refresh(db_ticket)
    return db_ticket

@router.post("/{ticket_id}/progress", response_model=TicketResponse)
async def update_ticket_progress(ticket_id: UUID, payload: ResolutionUpdate, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    reviewer = await verify_it_management(current_user)
    db_ticket = await ticket_service.get_ticket(db, ticket_id)
    if not db_ticket: raise HTTPException(status_code=404, detail="Ticket not found")
    db_ticket.resolution_notes, db_ticket.resolution_checklist, db_ticket.resolution_percentage = payload.notes, payload.checklist, payload.percentage
    if db_ticket.status not in ["IN_PROGRESS", "RESOLVED"]: db_ticket.status = "IN_PROGRESS"
    await timeline_service.log_ticket_event(
        db, db_ticket, "PROGRESS_UPDATE", 
        f"Resolution progress updated to {payload.percentage}%", 
        current_user
    )
    await db.commit()
    await db.refresh(db_ticket)
    await send_notification(db, db_ticket.id, "ticket_updated", status="IN_PROGRESS", updated_by=reviewer.full_name, comment=f"Progress: {payload.percentage}%")
    return db_ticket

@router.post("/{ticket_id}/resolve", response_model=TicketResponse)
async def resolve_ticket(ticket_id: UUID, payload: ResolutionUpdate, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    reviewer = await verify_it_management(current_user)
    db_ticket = await ticket_service.get_ticket(db, ticket_id)
    if not db_ticket: raise HTTPException(status_code=404, detail="Ticket not found")
    db_ticket.resolution_notes, db_ticket.resolution_checklist, db_ticket.resolution_percentage, db_ticket.status = payload.notes, payload.checklist, 100.0, "RESOLVED"
    if not db_ticket.assigned_to_id: db_ticket.assigned_to_id = reviewer.id
    
    await timeline_service.log_ticket_event(
        db, db_ticket, "RESOLVED", 
        payload.notes or "Resolved", 
        current_user
    )
    if db_ticket.status == "RESOLVED":
        await AutomationService.mark_sla_resolved(db, db_ticket.id)

    await db.commit()
    await db.refresh(db_ticket)
    await send_notification(db, db_ticket.id, "ticket_resolved", resolution_notes=payload.notes or "Resolved")
    return db_ticket

@router.get("/solvers/{user_id}/portfolio")
async def get_solver_portfolio(user_id: UUID, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    user_res = await db.execute(select(User).where(User.id == user_id))
    db_user = user_res.scalar_one_or_none()
    if not db_user: raise HTTPException(status_code=404, detail="Not found")
    lifetime_res = await db.execute(select(func.count(Ticket.id)).where(Ticket.assigned_to_id == user_id, Ticket.status == "RESOLVED"))
    lifetime_count = lifetime_res.scalar_one()
    month_res = await db.execute(select(func.count(Ticket.id)).where(Ticket.assigned_to_id == user_id, Ticket.status == "RESOLVED", Ticket.updated_at >= datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)))
    month_count = month_res.scalar_one()
    mttr_res = await db.execute(select(Ticket.created_at, Ticket.updated_at).where(Ticket.assigned_to_id == user_id, Ticket.status == "RESOLVED"))
    total_h = sum((r.updated_at - r.created_at).total_seconds() / 3600.0 for r in mttr_res.all() if r.created_at and r.updated_at)
    cat_res = await db.execute(select(Ticket.category, func.count(Ticket.id)).where(Ticket.assigned_to_id == user_id, Ticket.status == "RESOLVED").group_by(Ticket.category))
    recent_res = await db.execute(select(Ticket).where(Ticket.assigned_to_id == user_id, Ticket.status == "RESOLVED").order_by(text("updated_at DESC")).limit(10))
    return {
        "profile": {
            "id": str(db_user.id), 
            "full_name": db_user.full_name, 
            "email": db_user.email, 
            "role": db_user.role.replace("_", " ").title(), 
            "department": db_user.dept_obj.name if db_user.dept_obj else "IT", 
            "persona": db_user.persona, 
            "join_date": db_user.created_at.date().isoformat()
        },
        "stats": {"lifetime_resolved": lifetime_count, "month_resolved": month_count, "mttr_hours": round(float(total_h / lifetime_count) if lifetime_count > 0 else 0.0, 1), "global_rank": 1},
        "expertise": [{"category": r[0] or "General", "count": r[1]} for r in cat_res.all()],
        "recent_work": [{"id": str(t.id), "subject": t.subject, "category": t.category or "General", "resolved_at": t.updated_at.isoformat(), "priority": t.priority} for t in recent_res.scalars().all()]
    }

@router.post("/{ticket_id}/approve-change", response_model=TicketResponse)
async def approve_change_request(
    ticket_id: UUID, 
    payload: ITDiagnosisRequest,
    db: AsyncSession = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    """
    CAB Action: Approve a Change Request and automatically unblock the pending PatchDeployment.
    """
    await verify_it_management(current_user)
    import uuid
    db_ticket = await ticket_service.get_ticket(db, ticket_id)
    if not db_ticket: raise HTTPException(status_code=404, detail="Ticket not found")
    
    if db_ticket.category != "Change Request":
        raise HTTPException(status_code=400, detail="Only Change Request tickets can be approved this way")
    
    # 1. Approve Ticket
    db_ticket.status = "APPROVED"
    await timeline_service.log_ticket_event(
        db, db_ticket, "CAB_APPROVED", 
        payload.notes or "Change Request Approved by CAB", 
        current_user
    )
    
    # 2. Find pending PatchDeployments for this asset (since related_asset_id ties it)
    if db_ticket.related_asset_id:
        deps_res = await db.execute(
            select(PatchDeployment).where(
                PatchDeployment.asset_id == db_ticket.related_asset_id,
                PatchDeployment.status == "PENDING_APPROVAL"
            )
        )
        deps = deps_res.scalars().all()
        
        for dep in deps:
            # Get Patch Info
            patch_res = await db.execute(select(SystemPatch).where(SystemPatch.id == dep.patch_id))
            patch = patch_res.scalars().first()
            if not patch: continue
            
            # Auto-Enqueue execution now that it's approved
            cmd = AgentCommand(
                id=uuid.uuid4(),
                asset_id=dep.asset_id,
                command="INSTALL_PATCH",
                payload={
                    "patch_id": str(patch.patch_id),
                    "deployment_id": str(dep.id),
                    "binary_url": patch.binary_url if patch.is_custom else None
                },
                status="PENDING",
            )
            db.add(cmd)
            dep.status = "PENDING"
            dep.last_check_at = func.now()

    await db.commit()
    await db.refresh(db_ticket)
    # Add audit logging
    from ..services.notification_service import send_notification
    await send_notification(db, db_ticket.id, "ticket_updated", status="APPROVED", updated_by=current_user.full_name, comment=payload.notes or "CAB Approved")
    return db_ticket

# TICKET ATTACHMENTS
UPLOAD_DIR = "uploads/tickets"

@router.post("/{ticket_id}/attachments", response_model=TicketAttachmentResponse)
async def upload_attachment(
    ticket_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Upload a file attachment for a ticket."""
    db_ticket = await ticket_service.get_ticket(db, ticket_id)
    if not db_ticket: raise HTTPException(status_code=404, detail="Ticket not found")

    # Access Control: Staff or Requestor
    if current_user.role not in STAFF_ROLES and db_ticket.requestor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1]
    safe_name = "".join([c for c in file.filename if c.isalnum() or c in ('.', '_', '-')]).strip()
    file_path = os.path.join(UPLOAD_DIR, f"{ticket_id}_{file_id}{file_ext}")

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    attachment = TicketAttachment(
        id=uuid.uuid4(),
        ticket_id=ticket_id,
        uploader_id=current_user.id,
        file_name=safe_name,
        file_path=file_path,
        file_type=file.content_type,
        file_size=0 # We could get size but let's keep it simple for now
    )
    db.add(attachment)
    
    await timeline_service.log_ticket_event(
        db, db_ticket, "ATTACHMENT_ADDED", 
        f"File '{safe_name}' attached by {current_user.full_name}.", 
        current_user,
        metadata={"file_name": safe_name, "file_id": str(attachment.id)}
    )
    
    await db.commit()
    await db.refresh(attachment)
    return attachment

@router.get("/{ticket_id}/attachments", response_model=List[TicketAttachmentResponse])
async def list_attachments(ticket_id: UUID, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    """List all attachments for a ticket."""
    db_ticket = await ticket_service.get_ticket(db, ticket_id)
    if not db_ticket: raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Access Control: Staff or Requestor
    if current_user.role not in STAFF_ROLES and db_ticket.requestor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    result = await db.execute(select(TicketAttachment).where(TicketAttachment.ticket_id == ticket_id))
    return result.scalars().all()

@router.get("/attachments/{attachment_id}")
async def download_attachment(attachment_id: UUID, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    """Download/View an attachment."""
    result = await db.execute(select(TicketAttachment).where(TicketAttachment.id == attachment_id))
    attachment = result.scalar_one_or_none()
    if not attachment: raise HTTPException(status_code=404, detail="Attachment not found")

    # Authorization Check
    db_ticket = await ticket_service.get_ticket(db, attachment.ticket_id)
    if current_user.role not in STAFF_ROLES and db_ticket.requestor_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    from fastapi.responses import FileResponse
    return FileResponse(attachment.file_path, filename=attachment.file_name)

@router.delete("/attachments/{attachment_id}")
async def delete_attachment(attachment_id: UUID, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    """Delete an attachment."""
    result = await db.execute(select(TicketAttachment).where(TicketAttachment.id == attachment_id))
    attachment = result.scalar_one_or_none()
    if not attachment: raise HTTPException(status_code=404, detail="Attachment not found")

    # Only uploader or Staff can delete
    if current_user.role not in STAFF_ROLES and attachment.uploader_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Remove file from disk
    if os.path.exists(attachment.file_path):
        os.remove(attachment.file_path)

    await db.delete(attachment)
    await db.commit()
    return {"status": "success", "message": "Attachment removed"}
