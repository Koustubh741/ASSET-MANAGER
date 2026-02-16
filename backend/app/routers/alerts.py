"""
GET /alerts - unified alerts for dashboard (warranty, requests, procurement approved).
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from ..database.database import get_db
from ..utils.auth_utils import get_current_user
from ..services.alerts_service import get_alerts

router = APIRouter(
    prefix="/alerts",
    tags=["alerts"]
)


@router.get("")
async def list_alerts(
    limit: int = Query(20, ge=1, le=50),
    days_warranty: int = Query(30, ge=1, le=365),
    days_procurement: int = Query(7, ge=1, le=90),
    types: Optional[str] = Query(None, description="Comma-separated: warranty,request,procurement_approved"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Returns a unified list of alerts (warranty expiring, new asset requests, recently procurement approved).
    Optional types filter to reflect user notification preferences.
    """
    department = getattr(current_user, "department", None) or getattr(current_user, "domain", None)
    role = getattr(current_user, "role", None)
    alerts = await get_alerts(
        db,
        limit=limit,
        days_warranty=days_warranty,
        days_procurement=days_procurement,
        types=types,
        user_role=role,
        department=department,
    )
    return alerts
