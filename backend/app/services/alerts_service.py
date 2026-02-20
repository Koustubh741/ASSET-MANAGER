"""
Alerts service: aggregate warranty expiries, pending asset requests, and recently procurement-approved requests into a unified alert list.
"""
from datetime import date, datetime, timedelta
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_, desc

from ..models.models import Asset, AssetRequest
from . import asset_request_service


def _time_ago(dt: datetime) -> str:
    if not dt:
        return ""
    now = datetime.utcnow()
    if dt.tzinfo:
        dt = dt.replace(tzinfo=None)  # naive for comparison
    delta = now - dt
    total_seconds = int(delta.total_seconds())
    if total_seconds < 60:
        return "Just now"
    if total_seconds < 3600:
        return f"{total_seconds // 60} minutes ago"
    if total_seconds < 86400:
        return f"{total_seconds // 3600} hours ago"
    if total_seconds < 604800:
        return f"{total_seconds // 86400} days ago"
    return f"{total_seconds // 604800} weeks ago"


async def get_alerts(
    db: AsyncSession,
    limit: int = 20,
    days_warranty: int = 30,
    days_procurement: int = 7,
    types: Optional[str] = None,
    user_id=None,
    user_role: Optional[str] = None,
    department: Optional[str] = None,
) -> List[dict]:
    """
    Build a unified list of alerts from warranty, asset requests (pending + recently approved).
    types: comma-separated filter e.g. "warranty,request,procurement_approved" (optional).
    """
    requested_types = set((types or "").strip().split(",")) if types else None
    alerts: List[dict] = []

    # --- Warranty expiring ---
    if requested_types is None or "warranty" in requested_types:
        today = date.today()
        cutoff = today + timedelta(days=days_warranty)
        q = select(Asset).where(
            and_(
                Asset.warranty_expiry.isnot(None),
                Asset.warranty_expiry >= today,
                Asset.warranty_expiry <= cutoff,
            )
        ).order_by(Asset.warranty_expiry).limit(10)
        result = await db.execute(q)
        assets = result.scalars().all()
        for asset in assets:
            days_left = (asset.warranty_expiry - today).days
            msg = f"{asset.name} ({asset.serial_number}) warranty expires in {days_left} days."
            alerts.append({
                "id": f"warranty-{asset.id}",
                "type": "warranty",
                "title": "Warranty Expiring Soon",
                "message": msg,
                "time": _time_ago(asset.updated_at) if getattr(asset, "updated_at", None) else "",
                "link": "/assets?risk=warranty",
                "created_at": datetime.utcnow().isoformat() + "Z",
            })

    # --- New / pending asset requests (SUBMITTED or early pending) ---
    if requested_types is None or "request" in requested_types:
        requests_pending = await asset_request_service.get_all_asset_requests(
            db, skip=0, limit=10, status="SUBMITTED",
            department=department, user_role=user_role
        )
        for req in requests_pending:
            name = getattr(req, "requester_name", None) or "User"
            asset_name = getattr(req, "asset_name", None) or getattr(req, "asset_type", "asset")
            alerts.append({
                "id": f"request-{req.id}",
                "type": "request",
                "title": "New Asset Request",
                "message": f"{name} requested {asset_name}.",
                "time": _time_ago(req.created_at) if getattr(req, "created_at", None) else "",
                "link": "/dashboard/system-admin/requests",
                "created_at": (req.created_at.isoformat() if req.created_at else ""),
            })

    # --- Recently procurement-approved ---
    if requested_types is None or "procurement_approved" in requested_types:
        cutoff_dt = datetime.utcnow() - timedelta(days=days_procurement)
        q = select(AssetRequest).where(
            and_(
                AssetRequest.procurement_finance_status.isnot(None),
                AssetRequest.procurement_finance_status.in_(["APPROVED"]),  # Finance-approved; no combined role
                AssetRequest.procurement_finance_reviewed_at >= cutoff_dt,
            )
        ).order_by(desc(AssetRequest.procurement_finance_reviewed_at)).limit(10)
        result = await db.execute(q)
        approved = result.scalars().all()
        for req in approved:
            asset_name = getattr(req, "asset_name", None) or getattr(req, "asset_type", "request")
            alerts.append({
                "id": f"procurement-{req.id}",
                "type": "procurement_approved",
                "title": "Procurement Approved",
                "message": f"Request for {asset_name} has been approved.",
                "time": _time_ago(req.procurement_finance_reviewed_at) if req.procurement_finance_reviewed_at else "",
                "link": "/procurement",
                "created_at": (req.procurement_finance_reviewed_at.isoformat() if req.procurement_finance_reviewed_at else ""),
            })

    # Sort by created_at descending (newest first) and limit
    alerts.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    return alerts[:limit]
