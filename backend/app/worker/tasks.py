import time
import uuid
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import text, or_
from .celery_app import celery_app
from ..database.database import SessionLocal
from ..models.models import PatchDeploymentJob, PatchLog, PatchDeployment, Asset

@celery_app.task(bind=True, name="app.worker.tasks.process_patch_job")
def process_patch_job(self, job_id: str):
    """
    Orchestrate a bulk patch deployment job (Enterprise Phase 2)
    """
    db = SessionLocal()
    try:
        job = db.query(PatchDeploymentJob).filter(PatchDeploymentJob.id == job_id).first()
        if not job:
            return f"Job {job_id} not found"

        job.status = "PROCESSING"
        db.commit()

        # 1. Identify Target Assets (Enterprise Filtering)
        criteria = job.target_criteria or {}
        # Default to Active assets and IT-relevant segments
        query = db.query(Asset).filter(Asset.status == "Active")
        
        group = str(criteria.get("group", "ALL")).upper()
        if group == "SERVERS":
            query = query.filter(Asset.type.ilike("%server%"))
        elif group == "WORKSTATIONS":
            query = query.filter(or_(
                Asset.type.ilike("%workstation%"),
                Asset.type.ilike("%laptop%"),
                Asset.type.ilike("%desktop%"),
                Asset.type.ilike("%tablet%")
            ))
        elif group != "ALL":
            # Fallback to segment/department mapping
            query = query.filter(or_(
                Asset.segment.ilike(f"%{group}%"), 
                Asset.type.ilike(f"%{group}%")
            ))
        
        # NOTE: Asset.platform column does not exist. 
        # OS info is in specifications JSONB but skipping broad platform filter for Phase 1.
        
        targets = query.all()
        job.total_assets = len(targets)
        db.commit()

        # 2. Spawn deployments and log progress
        for asset in targets:
            try:
                # Create or find existing deployment entry
                deployment = db.query(PatchDeployment).filter(
                    PatchDeployment.patch_id == job.patch_id,
                    PatchDeployment.asset_id == asset.id
                ).first()

                if not deployment:
                    deployment = PatchDeployment(
                        patch_id=job.patch_id,
                        asset_id=asset.id,
                        status="PENDING"
                    )
                    db.add(deployment)
                    db.flush()

                # Enterprise Logging
                log = PatchLog(
                    id=uuid.uuid4(),
                    deployment_id=deployment.id,
                    asset_id=asset.id,
                    level="INFO",
                    message=f"Starting deployment of patch {job.patch_id} to {asset.name}"
                )
                db.add(log)
                
                # SIMULATION: In reality, we would send a message to the agent here
                # For Phase 2, we simulate success for demonstration
                deployment.status = "DONE"
                deployment.installed_at = datetime.now(timezone.utc)
                job.completed_assets += 1
                
                db.commit()

            except Exception as e:
                job.failed_assets += 1
                db.rollback()
                print(f"Failed to deploy to {asset.id}: {e}")

        job.status = "COMPLETED"
        job.completed_at = datetime.now(timezone.utc)
        db.commit()
        return f"Job {job_id} finished: {job.completed_assets} success, {job.failed_assets} failed"

    except Exception as e:
        db.rollback()
        if job:
            job.status = "FAILED"
            db.commit()
        raise e
    finally:
        db.close()
