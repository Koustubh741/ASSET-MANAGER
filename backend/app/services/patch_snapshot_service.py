"""
Patch Snapshot Service — Phase 6
Takes daily per-asset compliance snapshots for trend chart display.
Called by APScheduler every day at 23:59.
"""
import uuid
import logging
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..models.models import PatchComplianceSnapshot
from ..services.patch_service import get_compliance_summary
from ..database.database import AsyncSessionLocal

logger = logging.getLogger(__name__)


async def snapshot_daily_compliance() -> dict:
    """
    Captures the current per-asset compliance state as a daily snapshot.
    Idempotent — skips assets that already have a snapshot for today.
    """
    today = datetime.now(timezone.utc).date()
    saved = 0

    async with AsyncSessionLocal() as db:
        try:
            # Re-use existing compliance logic
            summaries = await get_compliance_summary(db)

            for row in summaries:
                # Check if snapshot already exists for today
                # Root Fix: Use timezone-aware 'today_start' for comparison
                today_start = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)
                existing = await db.execute(
                    select(PatchComplianceSnapshot).where(
                        PatchComplianceSnapshot.asset_id == row["asset_id"],
                        PatchComplianceSnapshot.snapshot_date >= today_start,
                    )
                )
                if existing.scalars().first():
                    continue  # Already snapshotted today

                snap = PatchComplianceSnapshot(
                    id=uuid.uuid4(),
                    snapshot_date=datetime.now(timezone.utc),
                    asset_id=row["asset_id"],
                    compliance_score=row["compliance_score"],
                    installed_patches=row["installed_patches"],
                    missing_patches=row["missing_patches"],
                    critical_missing=row["critical_missing"],
                )
                db.add(snap)
                saved += 1

            await db.commit()
            logger.info(f"[PatchSnapshot] Saved {saved} snapshots for {today}")
        except Exception as e:
            logger.error(f"[PatchSnapshot] Failed: {e}")
            await db.rollback()
            raise

    return {"date": today.isoformat(), "snapshots_saved": saved}


async def get_compliance_history(db: AsyncSession, days: int = 30) -> list:
    """
    Fetch compliance history for the past N days (for trend chart).
    Returns grouped by date → average fleet compliance score.
    """
    from datetime import timedelta
    from sqlalchemy import func

    since = datetime.now(timezone.utc) - timedelta(days=days)

    result = await db.execute(
        select(
            func.date_trunc("day", PatchComplianceSnapshot.snapshot_date).label("day"),
            func.avg(PatchComplianceSnapshot.compliance_score).label("avg_score"),
            func.sum(PatchComplianceSnapshot.missing_patches).label("total_missing"),
            func.sum(PatchComplianceSnapshot.critical_missing).label("critical_missing"),
        )
        .where(PatchComplianceSnapshot.snapshot_date >= since)
        .group_by(func.date_trunc("day", PatchComplianceSnapshot.snapshot_date))
        .order_by(func.date_trunc("day", PatchComplianceSnapshot.snapshot_date))
    )
    rows = result.all()

    return [
        {
            "date": row.day.date().isoformat() if row.day else None,
            "avg_score": round(float(row.avg_score), 2),
            "total_missing": int(row.total_missing or 0),
            "critical_missing": int(row.critical_missing or 0),
        }
        for row in rows
    ]
