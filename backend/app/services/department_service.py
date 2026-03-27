"""
Department service layer - Scoped operations for departments
"""
from uuid import UUID
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, and_, select, extract
from ..models.models import Asset, User, Ticket, AssetRequest, MaintenanceRecord, Department

async def get_department_stats(db: AsyncSession, department_id: UUID):
    """
    Get aggregated statistics scoped to a specific department by ID
    """
    # Get Department Metadata
    dept_query = select(Department).filter(Department.id == department_id)
    dept_obj = (await db.execute(dept_query)).scalar_one_or_none()
    
    if not dept_obj:
        return {"error": "Department not found"}

    # Base filter for department
    dept_filter = User.department_id == department_id
    
    # Total Assets in Department
    total_query = select(func.count(Asset.id)).join(User, Asset.assigned_to_id == User.id).filter(dept_filter)
    total = (await db.execute(total_query)).scalar() or 0
    
    # Active Assets
    active_query = select(func.count(Asset.id)).join(User, Asset.assigned_to_id == User.id).filter(
        and_(dept_filter, Asset.status == "Active")
    )
    active = (await db.execute(active_query)).scalar() or 0
    
    # Department Members
    members_count_query = select(func.count(User.id)).filter(dept_filter)
    members_count = (await db.execute(members_count_query)).scalar() or 0
    
    # Pending Requests for Department Users
    requests_query = select(func.count(AssetRequest.id)).join(User, AssetRequest.requester_id == User.id).filter(
        and_(dept_filter, AssetRequest.status.notin_(["CLOSED", "IN_USE", "USER_REJECTED"]))
    )
    pending_requests = (await db.execute(requests_query)).scalar() or 0
    
    # Open Tickets for Department Users
    tickets_query = select(func.count(Ticket.id)).join(User, Ticket.requestor_id == User.id).filter(
        and_(dept_filter, Ticket.status.in_(["Open", "Pending"]))
    )
    open_tickets = (await db.execute(tickets_query)).scalar() or 0

    # Total Departmental Asset Value
    value_query = select(func.sum(Asset.cost)).join(User, Asset.assigned_to_id == User.id).filter(dept_filter)
    total_value = (await db.execute(value_query)).scalar() or 0.0

    # Type Breakdown
    type_results = (await db.execute(
        select(Asset.type, func.count(Asset.id))
        .join(User, Asset.assigned_to_id == User.id)
        .filter(dept_filter)
        .group_by(Asset.type)
    )).all()
    
    by_type = [{"name": t or "Other", "value": c} for t, c in type_results]

    # Onboarding Assets (Allocated/Configuring)
    onboarding_query = select(Asset).join(User, Asset.assigned_to_id == User.id).filter(
        and_(dept_filter, Asset.status.in_(["Allocated", "Configuring"]))
    ).limit(5)
    onboarding_result = await db.execute(onboarding_query)
    onboarding_assets = onboarding_result.scalars().all()

    # High Risk / EOL Assets
    eol_query = select(Asset).join(User, Asset.assigned_to_id == User.id).filter(
        and_(dept_filter, Asset.status == "Scrap Candidate")
    ).limit(5)
    eol_result = await db.execute(eol_query)
    eol_assets = eol_result.scalars().all()

    return {
        "department_id": str(department_id),
        "department_name": dept_obj.name,
        "department_slug": dept_obj.slug,
        "metadata": dept_obj.dept_metadata,
        "total_assets": total,
        "active_assets": active,
        "total_members": members_count,
        "pending_requests": pending_requests,
        "open_tickets": open_tickets,
        "total_value": float(total_value),
        "by_type": by_type,
        "onboarding_assets": onboarding_assets,
        "eol_assets": eol_assets,
        "health_score": min(100, int((active / (total or 1)) * 100)) if total > 0 else 100
    }


async def get_department_members(db: AsyncSession, department_id: UUID):
    """
    Get all users in a department by ID
    """
    query = select(User).filter(User.department_id == department_id)
    result = await db.execute(query)
    return result.scalars().all()

