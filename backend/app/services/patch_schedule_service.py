"""
Patch Schedule Service — Phase 5
Manages maintenance windows and executes scheduled patch deployments.
"""
import uuid
import logging
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..models.models import PatchSchedule, SystemPatch, PatchDeployment, AgentCommand, Asset
from ..database.database import AsyncSessionLocal

logger = logging.getLogger(__name__)


async def execute_scheduled_patch(schedule_id: str) -> dict:
    """
    Execute a scheduled patch deployment.
    Called by APScheduler at the maintenance window time.
    Deploys to target group: ALL | PILOT | SERVERS | WORKSTATIONS
    """
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(PatchSchedule).where(PatchSchedule.id == uuid.UUID(schedule_id))
            )
            schedule = result.scalars().first()
            if not schedule:
                logger.error(f"[PatchSchedule] Schedule {schedule_id} not found")
                return {"error": "Schedule not found", "schedule_id": schedule_id}

            if schedule.status != "PENDING":
                logger.warning(f"[PatchSchedule] Schedule {schedule_id} is already {schedule.status}")
                return {"skipped": True}

            schedule.status = "RUNNING"
            await db.commit()

            # Resolve target assets
            patch_result = await db.execute(
                select(SystemPatch).where(SystemPatch.id == schedule.patch_id)
            )
            patch = patch_result.scalars().first()
            if not patch:
                schedule.status = "FAILED"
                schedule.error_message = "Patch not found"
                await db.commit()
                return {"error": "Patch not found", "schedule_id": schedule_id}

            # Build asset query based on target group
            asset_query = select(Asset).where(Asset.status == "IN_USE")
            if schedule.target_group == "PILOT":
                asset_query = asset_query.where(Asset.is_pilot == True)
            elif schedule.target_group == "SERVERS":
                asset_query = asset_query.where(Asset.type.ilike("%server%"))
            elif schedule.target_group == "WORKSTATIONS":
                asset_query = asset_query.where(Asset.type.in_(["Laptop", "Desktop", "Workstation"]))

            assets_result = await db.execute(asset_query)
            assets = assets_result.scalars().all()

            deployed = 0
            for asset in assets:
                # Upsert deployment
                dep_result = await db.execute(
                    select(PatchDeployment).where(
                        PatchDeployment.patch_id == schedule.patch_id,
                        PatchDeployment.asset_id == asset.id,
                    )
                )
                dep = dep_result.scalars().first()
                if not dep:
                    dep = PatchDeployment(
                        id=uuid.uuid4(),
                        patch_id=schedule.patch_id,
                        asset_id=asset.id,
                    )
                    db.add(dep)

                dep.status = "PENDING"
                dep.last_check_at = datetime.now(timezone.utc)

                # Queue agent command
                cmd = AgentCommand(
                    id=uuid.uuid4(),
                    asset_id=asset.id,
                    command="INSTALL_PATCH",
                    payload={
                        "patch_id": str(patch.patch_id),
                        "deployment_id": str(dep.id),
                        "scheduled": True,
                        "target_group": schedule.target_group,
                    },
                    status="PENDING",
                )
                db.add(cmd)
                deployed += 1

            schedule.status = "DONE"
            schedule.executed_at = datetime.now(timezone.utc)
            await db.commit()
            logger.info(f"[PatchSchedule] {schedule_id}: Deployed to {deployed} assets")
            return {"deployed": deployed, "target_group": schedule.target_group}

    except Exception as e:
        logger.error(f"[PatchSchedule] Critical execution failure: {e}")
        # Best effort attempt to mark failure if possible
        try:
             async with AsyncSessionLocal() as db:
                result = await db.execute(
                    select(PatchSchedule).where(PatchSchedule.id == uuid.UUID(schedule_id))
                )
                schedule = result.scalars().first()
                if schedule:
                    schedule.status = "FAILED"
                    schedule.error_message = str(e)
                    await db.commit()
        except Exception:
            pass
        return {"error": str(e), "schedule_id": schedule_id}


async def register_schedule_job(schedule) -> None:
    """Register an APScheduler DateTrigger job for a new PatchSchedule."""
    try:
        from apscheduler.triggers.date import DateTrigger
        from ..scheduler import scheduler  # The global APScheduler instance

        scheduler.add_job(
            execute_scheduled_patch,
            trigger=DateTrigger(run_date=schedule.scheduled_at),
            id=f"patch_schedule_{schedule.id}",
            args=[str(schedule.id)],
            replace_existing=True,
        )
        logger.info(f"[PatchSchedule] Registered job for schedule {schedule.id} at {schedule.scheduled_at}")
    except Exception as e:
        logger.warning(f"[PatchSchedule] Could not register APScheduler job: {e}")
