from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_
from typing import List, Optional
from ..database.database import get_db
from ..models.models import AuditLog, Asset
from pydantic import BaseModel
from uuid import UUID
from ..routers.auth import check_ADMIN, check_user_list_access
from ..utils.auth_utils import get_current_user
from ..schemas.common_schema import PaginatedResponse
from datetime import datetime

router = APIRouter(
    prefix="/audit",
    tags=["audit"]
)

async def check_audit_access(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Dependency to check if user has access to audit logs.
    Admins see all. Managers see their department.
    """
    if current_user.role in ["ADMIN", "SUPPORT"] or current_user.position == "MANAGER":
        return current_user
        
    raise HTTPException(
        status_code=403,
        detail="Only ADMIN, SUPPORT, or Managers can view audit logs"
    )

class AuditLogResponse(BaseModel):
    id: UUID
    entity_type: str
    entity_id: Optional[str] = None
    action: str
    performed_by: Optional[UUID] = None
    timestamp: datetime
    details: Optional[dict] = None

    class Config:
        from_attributes = True

@router.get("/logs", response_model=PaginatedResponse[AuditLogResponse])
async def get_audit_logs(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    after_id: Optional[UUID] = None,
    entity_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_audit_access)
):
    """
    Get system audit logs with pagination (Asynchronous).
    Root Fix: Supports 100k user scalability with structured pagination.
    """
    query = select(AuditLog)
    
    # 1. Base scoping filters
    filter_clauses = []
    if current_user.role not in ["ADMIN", "SUPPORT"] and current_user.position == "MANAGER":
        from ..models.models import User
        manager_unit = current_user.department or current_user.domain
        query = query.join(User, AuditLog.performed_by == User.id)
        filter_clauses.append((User.department == manager_unit) | (User.domain == manager_unit))

    if entity_type:
        filter_clauses.append(AuditLog.entity_type == entity_type)
        
    if after_id:
        res_anchor = await db.execute(select(AuditLog).filter(AuditLog.id == after_id))
        anchor = res_anchor.scalars().first()
        if anchor:
            filter_clauses.append(and_(AuditLog.timestamp <= anchor.timestamp, AuditLog.id < anchor.id))

    if filter_clauses:
        query = query.filter(*filter_clauses)

    # 2. Total Count
    count_query = select(func.count(AuditLog.id))
    if current_user.role not in ["ADMIN", "SUPPORT"] and current_user.position == "MANAGER":
        from ..models.models import User
        count_query = count_query.join(User, AuditLog.performed_by == User.id).filter(filter_clauses[0])
        if entity_type: count_query = count_query.filter(AuditLog.entity_type == entity_type)
    elif entity_type:
        count_query = count_query.filter(AuditLog.entity_type == entity_type)
        
    total = (await db.execute(count_query)).scalar() or 0

    # 3. Execution
    skip = (page - 1) * size
    query = query.order_by(AuditLog.timestamp.desc(), AuditLog.id.desc()).offset(skip).limit(size)
    result = await db.execute(query)
    data = result.scalars().all()
    
    return PaginatedResponse(
        total=total,
        page=page,
        size=size,
        data=data
    )

@router.get("/stats")
async def get_audit_stats(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(check_audit_access)
):
    """
    Get audit log statistics (Asynchronous).
    """
    base_query = select(AuditLog)
    
    # Apply manager scoping
    if current_user.role not in ["ADMIN", "SUPPORT"] and current_user.position == "MANAGER":
        from ..models.models import User
        manager_unit = current_user.department or current_user.domain
        base_query = base_query.join(User, AuditLog.performed_by == User.id).filter(
            (User.department == manager_unit) | (User.domain == manager_unit)
        )

    total_res = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total = total_res.scalar() or 0
    
    api_res = await db.execute(select(func.count()).select_from(
        base_query.filter(AuditLog.action == "DATA_COLLECT").subquery()
    ))
    api_collects = api_res.scalar() or 0
    
    return {
        "total": total,
        "api_collects": api_collects
    }

@router.post("/sync")
async def sync_orphaned_logs(
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_ADMIN)
):
    """
    Search for DATA_COLLECT logs that don't have corresponding assets and create them (Asynchronous).
    """
    res_logs = await db.execute(select(AuditLog).filter(AuditLog.action == "DATA_COLLECT"))
    logs = res_logs.scalars().all()
    repaired_count = 0
    
    for log in logs:
        data = log.details
        if not data or not isinstance(data, dict):
            continue
        
        serial_number = data.get("serial_number")
        if not serial_number:
            continue
            
        # Check if asset exists
        res_asset = await db.execute(select(Asset).filter(Asset.serial_number == serial_number))
        existing_asset = res_asset.scalars().first()
        if existing_asset:
            continue
            
        # Create asset from log data
        try:
            hostname = data.get("hostname") or data.get("name") or "Unknown"
            asset_metadata = data.get("asset_metadata", {})
            hardware = data.get("hardware", {})
            
            asset_type = data.get("type") or asset_metadata.get("type", "Unknown")
            asset_model = data.get("model") or hardware.get("model") or "Unknown"
            asset_vendor = data.get("vendor") or data.get("manufacturer") or hardware.get("manufacturer") or "Unknown"
            asset_segment = data.get("segment") or asset_metadata.get("segment", "IT")
            asset_location = data.get("location") or asset_metadata.get("location")
            asset_status = data.get("status", "Active")
            
            specifications = {
                "hardware": hardware if hardware else {k: v for k, v in data.items() if k in ["model", "manufacturer", "cpu", "ram", "storage"]},
                "os": data.get("os", {}),
                "network": data.get("network", {})
            }

            new_asset = Asset(
                name=hostname,
                type=asset_type,
                model=asset_model,
                vendor=asset_vendor,
                serial_number=serial_number,
                segment=asset_segment,
                status=asset_status,
                location=asset_location,
                specifications=specifications,
                cost=data.get("cost", 0.0)
            )
            
            db.add(new_asset)
            await db.commit() # Individual commit for safety in loop, or could bulk for perf
            repaired_count += 1
        except Exception as e:
            print(f"Failed to sync log {log.id}: {e}")
            await db.rollback()
            
    return {
        "status": "success",
        "synced_count": repaired_count
    }
