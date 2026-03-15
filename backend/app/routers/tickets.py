from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, text, delete
import logging
from typing import List, Optional, Dict, Any, TypedDict, cast
from uuid import UUID
from datetime import datetime

from ..database.database import get_db
from ..schemas.ticket_schema import (
    TicketCreate, TicketUpdate, TicketResponse, 
    ITDiagnosisRequest, ResolutionUpdate, 
    TicketCategorySummaryResponse, TicketCategoryStat,
    WorkflowRuleCreate, WorkflowRuleResponse,
    SLAPolicyCreate, SLAPolicyResponse
)
from ..schemas.user_schema import UserResponse
from ..models.models import User, Asset, ByodDevice, Ticket
from ..models.automation import WorkflowRule, SLAPolicy
from ..services import ticket_service, asset_request_service
from ..services.notification_service import send_notification
from ..services.automation_service import AutomationService
from ..utils.auth_utils import get_current_user

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

async def verify_it_management(user: UserResponse) -> UserResponse:
    authorized_roles = ["IT_MANAGEMENT", "IT_SUPPORT", "ADMIN", "ASSET_MANAGER", "SUPPORT_SPECIALIST"]
    if user.role not in authorized_roles:
        raise HTTPException(
            status_code=403,
            detail=f"Unauthorized: Role {user.role} does not have IT access",
        )
    if user.status != "ACTIVE":
        raise HTTPException(
            status_code=403,
            detail="User account is not active",
        )
    return user

async def verify_it_allocation(user: UserResponse) -> UserResponse:
    if user.role == "ADMIN":
        return user
    it_roles = ["IT_MANAGEMENT", "IT_SUPPORT", "ASSET_MANAGER"]
    if user.role in it_roles and user.position == "MANAGER":
        return user
    raise HTTPException(
        status_code=403,
        detail="Unauthorized: Only IT Managers or Admins can allocate tickets to others",
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
    await verify_it_allocation(current_user)
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

# --- Standard Ticket Endpoints ---

@router.get("/stats/category", response_model=TicketCategorySummaryResponse)
async def get_ticket_stats_by_category(
    range_days: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(Ticket.category, Ticket.status, Ticket.created_at, Ticket.updated_at, User.department).outerjoin(User, Ticket.requestor_id == User.id)
    query = query.where(Ticket.created_at >= func.now() - text(f"INTERVAL '{range_days} days'"))
    result = await db.execute(query)
    tickets = result.all()
    
    asset_query = select(Asset.type, func.count(Asset.id)).group_by(Asset.type)
    asset_result = await db.execute(asset_query)
    asset_counts = {row[0]: row[1] for row in asset_result.all()}
    
    stats_map: Dict[str, StatsEntry] = {}
    total_tickets = 0
    for t in tickets:
        cat = str(t.category or "Uncategorized")
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
        if t.department: sm["depts"][t.department] = sm["depts"].get(t.department, 0) + 1
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
    query = select(User.id.label("user_id"), User.full_name, User.role, User.position, Ticket.id, Ticket.category, Ticket.created_at, Ticket.updated_at).join(User, Ticket.assigned_to_id == User.id).filter(Ticket.status == "RESOLVED", User.role.in_(["IT_SUPPORT", "SUPPORT_SPECIALIST", "IT_MANAGEMENT", "ADMIN"]))
    if range_days is not None: query = query.where(Ticket.updated_at >= func.now() - text(f"INTERVAL '{range_days} days'"))
    result = await db.execute(query)
    rows = result.all()
    solvers: Dict[UUID, SolverStatsEntry] = {}
    for row in rows:
        uid = row.user_id
        if uid not in solvers: solvers[uid] = cast(SolverStatsEntry, {"full_name": str(row.full_name), "count": 0, "categories": set(), "mttr_total_hours": 0.0})
        sd = solvers[uid]
        sd["count"] += 1
        sd["categories"].add(str(row.category or "Other"))
        if row.created_at and row.updated_at: sd["mttr_total_hours"] += (row.updated_at - row.created_at).total_seconds() / 3600.0
    output = []
    for uid, data in solvers.items():
        output.append({
            "id": uid, "full_name": data["full_name"], "tickets_solved": data["count"],
            "avg_resolve_time_hours": round(float(data["mttr_total_hours"] / data["count"]), 1) if data["count"] > 0 else 0.0,
            "specialties": sorted(list(set(str(c).replace("_", " ").title() for c in data["categories"])))
        })
    output.sort(key=lambda x: int(x["tickets_solved"]), reverse=True)
    return output

@router.post("/", response_model=TicketResponse)
async def create_ticket(ticket: TicketCreate, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    requestor_id = current_user.id
    if ticket.related_asset_id:
        res_asset = await db.execute(select(Asset).filter(Asset.id == ticket.related_asset_id))
        if not res_asset.scalars().first():
            res_byod = await db.execute(select(ByodDevice).filter(ByodDevice.id == ticket.related_asset_id))
            if not res_byod.scalars().first(): raise HTTPException(status_code=400, detail="related_asset_id invalid")
    res = await ticket_service.create_ticket_v2(db=db, ticket=ticket, requestor_id=requestor_id)
    try:
        await AutomationService.apply_routing_rules(db, res.id)
        await db.refresh(res)
        await AutomationService.initialize_ticket_sla(db, res.id)
    except Exception as e: logger.error(f"Automation error: {str(e)}")
    await send_notification(db, res.id, "ticket_created")
    return res

@router.get("/", response_model=List[TicketResponse])
async def read_tickets(skip: int = 0, limit: int = 100, department: Optional[str] = None, search: Optional[str] = None, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    eff_id = current_user.id if current_user.role == "END_USER" and current_user.position != "MANAGER" else None
    if current_user.position == "MANAGER" and current_user.role not in ["ADMIN", "IT_MANAGEMENT", "IT_SUPPORT", "SUPPORT_SPECIALIST", "ASSET_MANAGER"]:
        department = department or current_user.department or current_user.domain
    return await ticket_service.get_tickets(db, requestor_id=eff_id, department=department, skip=skip, limit=limit, search=search)

@router.get("/{ticket_id}", response_model=TicketResponse)
async def read_ticket(ticket_id: UUID, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    db_ticket = await ticket_service.get_ticket(db, ticket_id=ticket_id)
    if not db_ticket: raise HTTPException(status_code=404, detail="Ticket not found")
    if current_user.role == "END_USER" and db_ticket.requestor_id != current_user.id: raise HTTPException(status_code=403, detail="Unauthorized")
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
        else: await verify_it_management(current_user)
    return await ticket_service.update_ticket(db, ticket_id=ticket_id, ticket_update=ticket_update)

@router.post("/{ticket_id}/it/diagnose", response_model=TicketResponse)
async def it_diagnose_ticket(ticket_id: UUID, payload: ITDiagnosisRequest, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    await verify_it_management(current_user)
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
    await db.commit()
    await db.refresh(db_ticket)
    return db_ticket

@router.post("/{ticket_id}/acknowledge", response_model=TicketResponse)
async def acknowledge_ticket(ticket_id: UUID, payload: ITDiagnosisRequest, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    reviewer = await verify_it_management(current_user)
    db_ticket = await ticket_service.get_ticket(db, ticket_id)
    if not db_ticket: raise HTTPException(status_code=404, detail="Ticket not found")
    if db_ticket.status and db_ticket.status.upper() == "OPEN":
        db_ticket.status, db_ticket.assigned_to_id = "IN_PROGRESS", reviewer.id
        tm = list(db_ticket.timeline) if db_ticket.timeline else []
        tm.append({"action": "ACKNOWLEDGED", "byRole": "IT_MANAGEMENT", "byUser": reviewer.full_name, "timestamp": datetime.utcnow().isoformat(), "comment": payload.notes or "Ticket acknowledged"})
        db_ticket.timeline = tm
        if payload.notes: db_ticket.resolution_notes = payload.notes
    await db.commit()
    await db.refresh(db_ticket)
    await send_notification(db, db_ticket.id, "ticket_updated", status="IN_PROGRESS", updated_by=reviewer.full_name, comment=payload.notes or "Acknowledged")
    return db_ticket

@router.post("/{ticket_id}/progress", response_model=TicketResponse)
async def update_ticket_progress(ticket_id: UUID, payload: ResolutionUpdate, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    reviewer = await verify_it_management(current_user)
    db_ticket = await ticket_service.get_ticket(db, ticket_id)
    if not db_ticket: raise HTTPException(status_code=404, detail="Ticket not found")
    db_ticket.resolution_notes, db_ticket.resolution_checklist, db_ticket.resolution_percentage = payload.notes, payload.checklist, payload.percentage
    if db_ticket.status not in ["IN_PROGRESS", "RESOLVED"]: db_ticket.status = "IN_PROGRESS"
    tm = list(db_ticket.timeline) if db_ticket.timeline else []
    if not tm or tm[-1].get("comment") != f"Resolution progress updated to {payload.percentage}%":
        tm.append({"action": "PROGRESS_UPDATE", "byRole": "IT_MANAGEMENT", "byUser": str(reviewer.full_name), "timestamp": datetime.utcnow().isoformat(), "comment": f"Resolution progress updated to {payload.percentage}%"})
        db_ticket.timeline = tm
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
    tm = list(db_ticket.timeline) if db_ticket.timeline else []
    tm.append({"action": "RESOLVED", "byRole": "IT_MANAGEMENT", "byUser": reviewer.full_name, "timestamp": datetime.utcnow().isoformat(), "comment": payload.notes or "Resolved"})
    db_ticket.timeline = tm
    await db.commit()
    await db_refresh(db_ticket)
    await send_notification(db, db_ticket.id, "ticket_resolved", resolution_notes=payload.notes or "Resolved")
    return db_ticket

@router.get("/solvers/{user_id}/portfolio")
async def get_solver_portfolio(user_id: UUID, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    user_res = await db.execute(select(User).where(User.id == user_id))
    db_user = user_res.scalar_one_or_none()
    if not db_user: raise HTTPException(status_code=404, detail="Not found")
    lifetime_res = await db.execute(select(func.count(Ticket.id)).where(Ticket.assigned_to_id == user_id, Ticket.status == "RESOLVED"))
    lifetime_count = lifetime_res.scalar_one()
    month_res = await db.execute(select(func.count(Ticket.id)).where(Ticket.assigned_to_id == user_id, Ticket.status == "RESOLVED", Ticket.updated_at >= datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)))
    month_count = month_res.scalar_one()
    mttr_res = await db.execute(select(Ticket.created_at, Ticket.updated_at).where(Ticket.assigned_to_id == user_id, Ticket.status == "RESOLVED"))
    total_h = sum((r.updated_at - r.created_at).total_seconds() / 3600.0 for r in mttr_res.all() if r.created_at and r.updated_at)
    cat_res = await db.execute(select(Ticket.category, func.count(Ticket.id)).where(Ticket.assigned_to_id == user_id, Ticket.status == "RESOLVED").group_by(Ticket.category))
    recent_res = await db.execute(select(Ticket).where(Ticket.assigned_to_id == user_id, Ticket.status == "RESOLVED").order_by(text("updated_at DESC")).limit(10))
    return {
        "profile": {"id": str(db_user.id), "full_name": db_user.full_name, "email": db_user.email, "role": db_user.role.replace("_", " ").title(), "department": db_user.department or "IT", "persona": db_user.persona, "join_date": db_user.created_at.date().isoformat()},
        "stats": {"lifetime_resolved": lifetime_count, "month_resolved": month_count, "mttr_hours": round(float(total_h / lifetime_count) if lifetime_count > 0 else 0.0, 1), "global_rank": 1},
        "expertise": [{"category": r[0] or "General", "count": r[1]} for r in cat_res.all()],
        "recent_work": [{"id": str(t.id), "subject": t.subject, "category": t.category or "General", "resolved_at": t.updated_at.isoformat(), "priority": t.priority} for t in recent_res.scalars().all()]
    }
