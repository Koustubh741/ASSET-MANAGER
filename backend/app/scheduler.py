from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import logging

logger = logging.getLogger(__name__)

# Global scheduler instance — imported by routers and main.py
scheduler = AsyncIOScheduler()


def setup_patch_scheduler_jobs():
    """
    Register all patch management scheduled jobs.
    Called once from main.py lifespan startup.
    """
    # Phase 3 — Daily vendor patch feed sync at 2:00 AM
    from .services.patch_sync_service import sync_all_patch_feeds
    scheduler.add_job(
        sync_all_patch_feeds,
        trigger=CronTrigger(hour=2, minute=0),
        id="patch_feed_sync",
        replace_existing=True,
        misfire_grace_time=3600,  # Allow 1-hour grace if missed
    )
    logger.info("[Scheduler] Registered: patch_feed_sync @ 02:00 daily")

    # Phase 6 — Daily compliance snapshot at 23:59
    from .services.patch_snapshot_service import snapshot_daily_compliance
    scheduler.add_job(
        snapshot_daily_compliance,
        trigger=CronTrigger(hour=23, minute=59),
        id="daily_compliance_snapshot",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    logger.info("[Scheduler] Registered: daily_compliance_snapshot @ 23:59 daily")
    
    # Powerful Workflow Automation: SLA Check every 5 minutes
    from .services.automation_service import automation_service
    from .database.database import AsyncSessionLocal
    
    async def run_sla_check():
        async with AsyncSessionLocal() as db:
            await automation_service.check_slas(db)

    scheduler.add_job(
        run_sla_check,
        trigger="interval",
        minutes=5,
        id="sla_check_job",
        replace_existing=True,
    )
    logger.info("[Scheduler] Registered: sla_check_job @ every 5 mins")
    # Phase 3 — Warranty Pulse Check (Every 1 hour)
    from .services.warranty_pulse_service import run_warranty_pulse
    from .database.database import AsyncSessionLocal
    
    async def run_warranty_pulse_job():
        async with AsyncSessionLocal() as db:
            await run_warranty_pulse(db)

    scheduler.add_job(
        run_warranty_pulse_job,
        trigger="interval",
        hours=1,
        id="warranty_pulse_job",
        replace_existing=True,
    )
    logger.info("[Scheduler] Registered: warranty_pulse_job @ every 1 hour")

    # Phase 4 — Daily cleanup of old read notifications (Older than 90 days)
    from .models.models import Notification
    from sqlalchemy import delete
    from datetime import datetime, timedelta, timezone
    
    async def run_notification_cleanup():
        async with AsyncSessionLocal() as db:
            cutoff = datetime.now(timezone.utc) - timedelta(days=90)
            stmt = delete(Notification).where(
                Notification.is_read == True,
                Notification.read_at < cutoff
            )
            await db.execute(stmt)
            await db.commit()
            logger.info("[Cleanup] Purged read notifications older than 90 days")

    scheduler.add_job(
        run_notification_cleanup,
        trigger=CronTrigger(hour=3, minute=0),
        id="notification_cleanup",
        replace_existing=True,
    )
    logger.info("[Scheduler] Registered: notification_cleanup @ 03:00 daily")
