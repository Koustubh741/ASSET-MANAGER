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
from ..utils.uuid_gen import get_uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, case

from ..database.database import get_db
from ..models.models import (
    SystemPatch, PatchDeployment, PatchSchedule, AgentCommand, Asset, AuditLog,
    Ticket, VulnerabilityMapping, PatchDeploymentJob, PatchLog
)
from ..schemas.patch_schema import (
    PatchComplianceHistoryPoint, PatchBulkDeployCreate, PatchBulkDeployResponse,
    PatchDeploymentJobResponse, PatchLogResponse, SystemPatchCreate, SystemPatchResponse,
    PatchComplianceSummary, PatchDeploymentCreate, PatchDeploymentResponse,
    PatchScheduleCreate, PatchScheduleResponse, AgentPatchStatusPayload
)
from ..worker.celery_app import celery_app
from ..services import patch_service, ticket_service
from ..schemas.ticket_schema import TicketCreate
from ..utils import auth_utils

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/patch-management", tags=["Patch Management"])


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _require_it(user):
    if user.role not in ("ADMIN", "IT", "IT_MANAGEMENT", "IT_SUPPORT"):
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
            id=get_uuid(),
            patch_id=deployment.patch_id,
            asset_id=deployment.asset_id,
        )
        db.add(dep)

    # Risk Assessment (Phase 3)
    v_map_result = await db.execute(
        select(VulnerabilityMapping).where(
            VulnerabilityMapping.patch_id == deployment.patch_id,
            VulnerabilityMapping.asset_id == deployment.asset_id
        )
    )
    v_map = v_map_result.scalars().first()
    risk_score = v_map.risk_score if v_map else 0.0

    if risk_score >= 10.0:
        # High Risk -> Require CAB Approval
        # Centralized Root Fix: Use ticket_service.create_ticket_v2
        ticket_data = TicketCreate(
            subject=f"Change Request: Deploy Patch {patch.patch_id}",
            description=f"Deploying {patch.title} to asset. Risk Score: {risk_score}",
            priority="High",
            category="Change Request",
            related_asset_id=deployment.asset_id
        )
        ticket = await ticket_service.create_ticket_v2(
            db, 
            ticket=ticket_data, 
            requestor_id=user.id, 
            override_status="Pending Approval"
        )
        dep.status = "PENDING_APPROVAL"
        audit_msg = f"Created Change Request for high-risk patch {patch.patch_id} on asset {deployment.asset_id}"
    else:
        # Low Risk -> Auto-Deploy
        cmd = AgentCommand(
            id=get_uuid(),
            asset_id=deployment.asset_id,
            command="INSTALL_PATCH",
            status="PENDING",
        )
        db.add(cmd)
        dep.status = "PENDING"
        audit_msg = f"Deployed low-risk patch {patch.patch_id} to asset {deployment.asset_id}"

    dep.last_check_at = datetime.now(timezone.utc)
    await db.commit()
    # Audit Log
    db.add(AuditLog(
        id=get_uuid(),
        performed_by=user.id,
        action="PATCH_DEPLOY",
        entity_type="Asset",
        entity_id=str(deployment.asset_id),
        details={"message": audit_msg}
    ))
    await db.commit()
    await db.refresh(dep)
    dep.patch_title = patch.title
    return dep


@router.post("/deploy-bulk", response_model=PatchDeploymentJobResponse)
async def deploy_patch_bulk(
    body: PatchBulkDeployCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(auth_utils.get_current_user)
):
    """
    Enterprise Phase 3: Optimized ASYNC bulk deployment.
    Creates a Deployment Job, triggers an ITIL Change Request, and dispatches Celery worker.
    """
    _require_it(user)

    # 1. Verify patch
    patch_result = await db.execute(select(SystemPatch).where(SystemPatch.id == body.patch_id))
    patch = patch_result.scalars().first()
    if not patch:
        raise HTTPException(status_code=404, detail="Patch not found")

    # 2. Create PatchDeploymentJob record
    job_id = get_uuid()
    job = PatchDeploymentJob(
        id=job_id,
        patch_id=patch.id,
        created_by=user.id,
        target_criteria={"group": body.target_group},
        status="QUEUED"
    )
    db.add(job)

    # 3. ITIL Automation: Create Change Request
    # Centralized Root Fix: Use ticket_service.create_ticket_v2
    ticket_data = TicketCreate(
        subject=f"Enterprise Change Request: Bulk Deploy {patch.title}",
        description=f"Automated CR for patch {patch.patch_id} ({patch.severity}) targeting {body.target_group}.",
        priority="High" if patch.severity == "Critical" else "Medium",
        category="Change Request"
    )
    ticket = await ticket_service.create_ticket_v2(
        db, 
        ticket=ticket_data, 
        requestor_id=user.id, 
        override_status="Pending Approval" if patch.severity == "Critical" else "Approved"
    )
    
    # 4. Gating logic
    if patch.severity == "Critical":
        job.status = "AWAITING_APPROVAL"
        audit_msg = f"Created AWAITING_APPROVAL job {job_id} for critical patch. CR {ticket.display_id} generated."
    else:
        # Auto-dispatch for non-critical (or policy-driven)
        from ..worker.tasks import process_patch_job
        # In a real async setup, we use .delay(). 
        # For this environment, we ensure celery is imported/configured.
        try:
            process_patch_job.delay(str(job_id))
            audit_msg = f"Dispatched async bulk deployment job {job_id}. CR {ticket.display_id} generated."
        except Exception as e:
            logger.error(f"Celery Dispatch Failed: {e}")
            job.status = "FAILED"
            audit_msg = f"Failed to dispatch job {job_id}: {str(e)}"

    await db.commit()
    
    db.add(AuditLog(
        id=get_uuid(),
        performed_by=user.id,
        action="PATCH_BULK_DEPLOY_INIT",
        entity_type="PatchJob",
        entity_id=str(job_id),
        details={"message": audit_msg}
    ))
    await db.commit()
    await db.refresh(job)
    return job


@router.get("/jobs", response_model=List[PatchDeploymentJobResponse])
async def get_patch_jobs(
    db: AsyncSession = Depends(get_db),
    user=Depends(auth_utils.get_current_user)
):
    """Retrieve all enterprise deployment jobs."""
    _require_it(user)
    # Join with SystemPatch to get the title
    stmt = (
        select(PatchDeploymentJob, SystemPatch.title.label("patch_title"))
        .join(SystemPatch, PatchDeploymentJob.patch_id == SystemPatch.id)
        .order_by(desc(PatchDeploymentJob.created_at))
    )
    result = await db.execute(stmt)
    jobs = []
    for row in result.all():
        job, title = row
        job.patch_title = title
        jobs.append(job)
    return jobs


@router.get("/jobs/{job_id}", response_model=PatchDeploymentJobResponse)
async def get_patch_job(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(auth_utils.get_current_user)
):
    """Retrieve status of an enterprise deployment job."""
    _require_it(user)
    stmt = (
        select(PatchDeploymentJob, SystemPatch.title.label("patch_title"))
        .join(SystemPatch, PatchDeploymentJob.patch_id == SystemPatch.id)
        .where(PatchDeploymentJob.id == job_id)
    )
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    job, title = row
    job.patch_title = title
    return job


@router.post("/jobs/{job_id}/approve", response_model=PatchDeploymentJobResponse)
async def approve_patch_job(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(auth_utils.get_current_user)
):
    """
    Manually approve an AWAITING_APPROVAL job.
    Triggers the Celery task and updates linked Change Request.
    """
    _require_it(user)
    result = await db.execute(select(PatchDeploymentJob).where(PatchDeploymentJob.id == job_id))
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != "AWAITING_APPROVAL":
        raise HTTPException(status_code=400, detail=f"Cannot approve job in '{job.status}' state")

    # 1. Update Ticket (if found)
    # Finding related CR ticket by subject/description containing job_id or patch_id
    # (In a more robust system, we'd have a mapping table)
    ticket_res = await db.execute(
        select(Ticket).where(Ticket.subject.ilike(f"%Bulk Deploy%")).order_by(Ticket.created_at.desc())
    )
    ticket = ticket_res.scalars().first()
    if ticket:
        ticket.status = "Approved"
        ticket.resolved_at = datetime.now(timezone.utc)

    # 2. Dispatch Celery
    from ..worker.tasks import process_patch_job
    try:
        process_patch_job.delay(str(job_id))
        job.status = "QUEUED"
        audit_msg = f"Approved and dispatched bulk deployment job {job_id}."
    except Exception as e:
        logger.error(f"Celery Dispatch Failed during approval: {e}")
        job.status = "FAILED"
        audit_msg = f"Failed to dispatch approved job {job_id}: {str(e)}"

    await db.commit()
    
    db.add(AuditLog(
        id=get_uuid(),
        performed_by=user.id,
        action="PATCH_JOB_APPROVE",
        entity_type="PatchJob",
        entity_id=str(job_id),
        details={"message": audit_msg}
    ))
    await db.commit()
    await db.refresh(job)
    return job


@router.get("/jobs/{job_id}/logs", response_model=List[PatchLogResponse])
async def get_patch_job_logs(
    job_id: UUID,
    db: AsyncSession = Depends(get_db),
    user=Depends(auth_utils.get_current_user)
):
    """Retrieve detailed execution logs for a job's deployments."""
    _require_it(user)
    # Join PatchLog with PatchDeployment to filter by job's patch_id if needed, 
    # but currently PatchLog points to a deployment.
    # We'll fetch logs related to current patch deployments.
    result = await db.execute(
        select(PatchLog).join(PatchDeployment).where(PatchDeployment.patch_id == (
            select(PatchDeploymentJob.patch_id).where(PatchDeploymentJob.id == job_id).scalar_subquery()
        )).order_by(PatchLog.timestamp.desc())
    )
    return result.scalars().all()


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
        id=get_uuid(),
        patch_id=body.patch_id,
        target_group=body.target_group,
        scheduled_at=body.scheduled_at,
        created_by=user.id,
        status="PENDING",
    )
    db.add(schedule)
    await db.commit()
    # Audit Log
    db.add(AuditLog(
        id=get_uuid(),
        performed_by=user.id,
        action="PATCH_SCHEDULE",
        entity_type="System",
        entity_id=str(None),
        details={"message": ""}
        ))
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
    db.add(AuditLog(
        id=get_uuid(),
        performed_by=user.id,
        action="PATCH_SCHEDULE_CANCEL",
        entity_type="PatchSchedule",
        entity_id=str(sched.id),
        details={"message": f"Cancelled scheduled patch {sched.patch_id}"}
    ))
    await db.commit()


# ─────────────────────────────────────────────────────────────────────────────
# PHASE 6 — Compliance Export & History
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/export/compliance")
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
        id=get_uuid(),
        asset_id=dep.asset_id,
        command="INSTALL_PATCH",
        payload={
            "patch_id": str(patch.patch_id),
            "deployment_id": str(dep.id),
            "retry": True,
            "binary_url": patch.binary_url if patch.is_custom else None
        },
        status="PENDING",
    )
    db.add(cmd)
    dep.status = "PENDING"
    dep.error_message = None
    dep.last_check_at = datetime.now(timezone.utc)
    await db.commit()
    # Audit Log
    db.add(AuditLog(
        id=get_uuid(),
        performed_by=user.id,
        action="PATCH_RETRY",
        entity_type="PatchDeployment",
        entity_id=str(dep.id),
        details={"message": f"Retried failed patch {dep.patch_id} on asset {dep.asset_id}"}
    ))
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
        id=get_uuid(),
        asset_id=dep.asset_id,
        command="ROLLBACK_PATCH",
        payload={
            "patch_id": str(patch.patch_id),
            "deployment_id": str(dep.id),
            "binary_url": patch.binary_url if patch.is_custom else None
        },
        status="PENDING",
    )
    db.add(cmd)
    dep.status = "ROLLING_BACK"
    dep.last_check_at = datetime.now(timezone.utc)
    await db.commit()
    # Audit Log
    db.add(AuditLog(
        id=get_uuid(),
        performed_by=user.id,
        action="PATCH_ROLLBACK",
        entity_type="PatchDeployment",
        entity_id=str(dep.id),
        details={"message": f"Initiated rollback for patch {dep.patch_id} on asset {dep.asset_id}"}
    ))
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


@router.get("/sync-status")
async def get_sync_status(
    user=Depends(auth_utils.get_current_user)
):
    """Retrieve the status of the last patch feed sync."""
    _require_it(user)
    from ..services.patch_sync_service import get_sync_status as service_get_status
    return service_get_status()


@router.post("/snapshot", status_code=202)
async def trigger_snapshot(
    db: AsyncSession = Depends(get_db),
    user=Depends(auth_utils.get_current_user)
):
    """
    Manually trigger a compliance snapshot (Phase 6).
    Useful for initializing historical trend data immediately.
    """
    _require_it(user)
    from ..services.patch_snapshot_service import snapshot_daily_compliance
    result = await snapshot_daily_compliance()
    
    # Audit Log
    db.add(AuditLog(
        id=get_uuid(),
        performed_by=user.id,
        action="PATCH_SNAPSHOT_TRIGGER",
        entity_type="System",
        entity_id=str(None),
        details={"message": ""}
        ))
    await db.commit()
    
    return {"status": "success", "data": result}
