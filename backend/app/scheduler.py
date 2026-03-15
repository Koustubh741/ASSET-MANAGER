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
