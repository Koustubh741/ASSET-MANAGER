"""
Patch Management Router — Full Root Implementation
All 8 phases of endpoints:
  - Phase 2: Agent patch status reporting
  - Phase 3: Vendor sync status
  - Phase 5: Schedule management
  - Phase 6: Compliance export + history
  - Phase 7: Retry + Rollback
"""
import uuid
import csv
import io
import logging
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from ..database.database import get_db
from ..models.models import (
    SystemPatch, PatchDeployment, PatchSchedule, AgentCommand, Asset
)
from ..schemas.patch_schema import (
    SystemPatchCreate, SystemPatchResponse,
    PatchDeploymentResponse, PatchDeploymentCreate,
    PatchComplianceSummary, PatchScheduleCreate, PatchScheduleResponse,
    PatchComplianceHistoryPoint, PatchBulkDeployCreate, PatchBulkDeployResponse
)
from ..services import patch_service
from ..utils import auth_utils

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/patches", tags=["patches"])


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _require_it(user):
    if user.role not in ("ADMIN", "IT"):
        raise HTTPException(status_code=403, detail="Requires ADMIN or IT role")


# ─────────────────────────────────────────────────────────────────────────────
# EXISTING ENDPOINTS (unchanged behaviour, enhanced responses)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[SystemPatchResponse])
async def get_patches(
    db: AsyncSession = Depends(get_db),
    user=Depends(auth_utils.get_current_user)
):
    """Return all available patches, sorted by CVSS score descending."""
    return await patch_service.get_all_patches(db)


@router.post("", response_model=SystemPatchResponse, status_code=201)
async def create_patch(
    patch: SystemPatchCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(auth_utils.get_current_user)
):
    _require_it(user)
    return await patch_service.create_patch(db, patch)


@router.get("/deployments", response_model=List[PatchDeploymentResponse])
async def get_deployments(
    asset_id: Optional[UUID] = None,
    patch_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    user=Depends(auth_utils.get_current_user)
):
    return await patch_service.get_patch_deployments(db, asset_id, patch_id)


@router.get("/compliance", response_model=List[PatchComplianceSummary])
async def get_compliance(
    db: AsyncSession = Depends(get_db),
    user=Depends(auth_utils.get_current_user)
):
    _require_it(user)
    return await patch_service.get_compliance_summary(db)


@router.post("/deploy", response_model=PatchDeploymentResponse)
async def deploy_patch(
    deployment: PatchDeploymentCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(auth_utils.get_current_user)
):
    """
    Queue a patch deployment.
    Phase 4: Creates an AgentCommand (PENDING) so the agent picks it up.
    Falls back to simulated install if asset has no agent registered.
    """
    _require_it(user)

    # Verify patch exists
    patch_result = await db.execute(
        select(SystemPatch).where(SystemPatch.id == deployment.patch_id)
    )
    patch = patch_result.scalars().first()
    if not patch:
        raise HTTPException(status_code=404, detail="Patch not found")

    # Upsert deployment record with PENDING status
    dep_result = await db.execute(
        select(PatchDeployment).where(
            PatchDeployment.patch_id == deployment.patch_id,
            PatchDeployment.asset_id == deployment.asset_id,
        )
    )
    dep = dep_result.scalars().first()
    if not dep:
        dep = PatchDeployment(
            id=uuid.uuid4(),
            patch_id=deployment.patch_id,
            asset_id=deployment.asset_id,
        )
        db.add(dep)

    # Enqueue AgentCommand (Phase 4)
    cmd = AgentCommand(
        id=uuid.uuid4(),
        asset_id=deployment.asset_id,
        command="INSTALL_PATCH",
        payload={"patch_id": str(patch.patch_id), "deployment_id": str(dep.id)},
        status="PENDING",
    )
    db.add(cmd)

    dep.status = "PENDING"
    dep.last_check_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(dep)
    dep.patch_title = patch.title
    return dep


@router.post("/deploy-bulk", response_model=PatchBulkDeployResponse)
async def deploy_patch_bulk(
    body: PatchBulkDeployCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(auth_utils.get_current_user)
):
    """
    Optimized bulk deployment.
    Finds all applicable assets in the target group and queues AgentCommands.
    """
    _require_it(user)

    # 1. Verify patch
    patch_result = await db.execute(select(SystemPatch).where(SystemPatch.id == body.patch_id))
    patch = patch_result.scalars().first()
    if not patch:
        raise HTTPException(status_code=404, detail="Patch not found")

    # 2. Resolve assets (Match logic from PatchScheduleService)
    asset_query = select(Asset).where(Asset.status == "IN_USE")
    if body.target_group == "PILOT":
        asset_query = asset_query.where(Asset.is_pilot == True)
    elif body.target_group == "SERVERS":
        asset_query = asset_query.where(Asset.type.ilike("%server%"))
    elif body.target_group == "WORKSTATIONS":
        asset_query = asset_query.where(Asset.type.in_(["Laptop", "Desktop", "Workstation"]))

    assets_result = await db.execute(asset_query)
    assets = assets_result.scalars().all()

    # 3. Filter by platform and existing status
    # Note: Using detect_platform logic conceptually. In a real app we'd share this helper.
    PLATFORM_KEYWORDS = {
        "Windows": ["windows", "win", "win10", "win11"],
        "Linux": ["linux", "ubuntu", "debian", "centos", "rhel", "fedora"],
        "macOS": ["macos", "mac", "osx", "darwin"]
    }

    queued_count = 0
    skipped_count = 0

    for asset in assets:
        # Platform check
        specs = (asset.specifications or {}).get("os", "").lower() or asset.type.lower()
        keywords = PLATFORM_KEYWORDS.get(patch.platform, [])
        if patch.platform != "Unknown" and not any(k in specs for k in keywords):
            skipped_count += 1
            continue

        # Check if already installed or pending
        status_check = await db.execute(
            select(PatchDeployment).where(
                PatchDeployment.patch_id == patch.id,
                PatchDeployment.asset_id == asset.id
            )
        )
        dep = status_check.scalars().first()
        if dep and dep.status in ("INSTALLED", "PENDING"):
            skipped_count += 1
            continue

        # Upsert deployment
        if not dep:
            dep = PatchDeployment(
                id=uuid.uuid4(),
                patch_id=patch.id,
                asset_id=asset.id,
            )
            db.add(dep)
        
        dep.status = "PENDING"
        dep.last_check_at = datetime.now(timezone.utc)

        # Queue AgentCommand
        cmd = AgentCommand(
            id=uuid.uuid4(),
            asset_id=asset.id,
            command="INSTALL_PATCH",
            payload={"patch_id": str(patch.patch_id), "deployment_id": str(dep.id), "bulk": True},
            status="PENDING",
        )
        db.add(cmd)
        queued_count += 1

    await db.commit()
    return PatchBulkDeployResponse(
        queued_count=queued_count,
        skipped_count=skipped_count,
        message=f"Successfully queued {queued_count} updates. {skipped_count} skipped (incompatible or already pending)."
    )


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 5 — Scheduling & Maintenance Windows
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/schedule", response_model=PatchScheduleResponse, status_code=201)
async def schedule_patch(
    body: PatchScheduleCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(auth_utils.get_current_user)
):
    """Schedule a patch for deferred deployment to a target group."""
    _require_it(user)

    patch_result = await db.execute(select(SystemPatch).where(SystemPatch.id == body.patch_id))
    if not patch_result.scalars().first():
        raise HTTPException(status_code=404, detail="Patch not found")

    schedule = PatchSchedule(
        id=uuid.uuid4(),
        patch_id=body.patch_id,
        target_group=body.target_group,
        scheduled_at=body.scheduled_at,
        created_by=user.id,
        status="PENDING",
    )
    db.add(schedule)
    await db.commit()
    await db.refresh(schedule)

    # Register APScheduler job dynamically
    try:
        from ..services.patch_schedule_service import register_schedule_job
        await register_schedule_job(schedule)
    except Exception as e:
        logger.warning(f"Could not register scheduler job: {e}")

    return schedule


@router.get("/schedules", response_model=List[PatchScheduleResponse])
async def get_schedules(
    db: AsyncSession = Depends(get_db),
    user=Depends(auth_utils.get_current_user)
):
    """List all scheduled patch deployments."""
    _require_it(user)
    result = await db.execute(
        select(PatchSchedule).order_by(desc(PatchSchedule.scheduled_at))
    )
    return result.scalars().all()


@router.delete("/schedules/{schedule_id}", status_code=204)
async def cancel_schedule(
    schedule_id: UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(auth_utils.get_current_user)
):
    """Cancel a pending scheduled deployment."""
    _require_it(user)
    result = await db.execute(select(PatchSchedule).where(PatchSchedule.id == schedule_id))
    sched = result.scalars().first()
    if not sched:
        raise HTTPException(status_code=404, detail="Schedule not found")
    if sched.status != "PENDING":
        raise HTTPException(status_code=400, detail=f"Cannot cancel a schedule in '{sched.status}' state")
    sched.status = "CANCELLED"
    await db.commit()


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 6 — Compliance Export & History
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/compliance/export")
async def export_compliance(
    format: str = Query("csv", regex="^(csv)$"),
    db: AsyncSession = Depends(get_db),
    user=Depends(auth_utils.get_current_user)
):
    """Download compliance report as CSV."""
    _require_it(user)
    data = await patch_service.get_compliance_summary(db)

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "asset_name", "platform", "compliance_score",
        "installed_patches", "missing_patches", "critical_missing", "asset_id"
    ])
    writer.writeheader()
    for row in data:
        writer.writerow({
            "asset_name": row["asset_name"],
            "platform": row.get("platform") or "Unknown",
            "compliance_score": f"{row['compliance_score']:.1f}%",
            "installed_patches": row["installed_patches"],
            "missing_patches": row["missing_patches"],
            "critical_missing": row["critical_missing"],
            "asset_id": str(row["asset_id"]),
        })
    output.seek(0)

    filename = f"patch_compliance_{datetime.now().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/compliance/history", response_model=List[PatchComplianceHistoryPoint])
async def get_compliance_history(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    user=Depends(auth_utils.get_current_user)
):
    """Return daily fleet compliance history for trend chart."""
    _require_it(user)
    from ..services.patch_snapshot_service import get_compliance_history
    return await get_compliance_history(db, days)


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 7 — Failure Handling: Retry & Rollback
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/retry/{deployment_id}", response_model=PatchDeploymentResponse)
async def retry_patch(
    deployment_id: UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(auth_utils.get_current_user)
):
    """Retry a failed patch deployment — re-enqueues the agent command."""
    _require_it(user)
    result = await db.execute(select(PatchDeployment).where(PatchDeployment.id == deployment_id))
    dep = result.scalars().first()
    if not dep:
        raise HTTPException(status_code=404, detail="Deployment not found")
    if dep.status not in ("FAILED", "MISSING"):
        raise HTTPException(status_code=400, detail=f"Cannot retry a deployment with status '{dep.status}'")

    patch_result = await db.execute(select(SystemPatch).where(SystemPatch.id == dep.patch_id))
    patch = patch_result.scalars().first()

    # Re-enqueue command
    cmd = AgentCommand(
        id=uuid.uuid4(),
        asset_id=dep.asset_id,
        command="INSTALL_PATCH",
        payload={"patch_id": str(patch.patch_id), "deployment_id": str(dep.id), "retry": True},
        status="PENDING",
    )
    db.add(cmd)
    dep.status = "PENDING"
    dep.error_message = None
    dep.last_check_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(dep)
    dep.patch_title = patch.title if patch else None
    return dep


@router.post("/rollback/{deployment_id}", response_model=PatchDeploymentResponse)
async def rollback_patch(
    deployment_id: UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(auth_utils.get_current_user)
):
    """Roll back an installed patch — enqueues a ROLLBACK_PATCH agent command."""
    _require_it(user)
    result = await db.execute(select(PatchDeployment).where(PatchDeployment.id == deployment_id))
    dep = result.scalars().first()
    if not dep:
        raise HTTPException(status_code=404, detail="Deployment not found")
    if dep.status != "INSTALLED":
        raise HTTPException(status_code=400, detail="Can only rollback INSTALLED deployments")

    patch_result = await db.execute(select(SystemPatch).where(SystemPatch.id == dep.patch_id))
    patch = patch_result.scalars().first()

    cmd = AgentCommand(
        id=uuid.uuid4(),
        asset_id=dep.asset_id,
        command="ROLLBACK_PATCH",
        payload={"patch_id": str(patch.patch_id), "deployment_id": str(dep.id)},
        status="PENDING",
    )
    db.add(cmd)
    dep.status = "ROLLING_BACK"
    dep.last_check_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(dep)
    dep.patch_title = patch.title if patch else None
    return dep


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 3 — Vendor Sync Status
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/sync-status")
async def get_sync_status(user=Depends(auth_utils.get_current_user)):
    """Return status of last vendor patch feed sync."""
    _require_it(user)
    from ..services.patch_sync_service import get_sync_status
    return get_sync_status()


@router.post("/sync", status_code=202)
async def trigger_sync(
    db: AsyncSession = Depends(get_db),
    user=Depends(auth_utils.get_current_user)
):
    """Manually trigger a vendor patch feed sync (runs in background)."""
    _require_it(user)
    import asyncio
    from ..services.patch_sync_service import sync_all_patch_feeds
    asyncio.create_task(sync_all_patch_feeds())
    return {"status": "accepted", "message": "Patch feed sync started in background"}
