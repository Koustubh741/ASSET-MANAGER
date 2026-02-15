
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, insert
from sqlalchemy.sql import func
from typing import Dict, Any, List
import uuid

from app.database.database import get_db, AsyncSessionLocal
from app.models.models import AgentConfiguration, AgentSchedule, DiscoveryScan, DiscoveryDiff, Asset
from app.schemas.agent_schema import AgentConfigUpdate, AgentConfigResponse, AgentValidationResponse, AgentScheduleUpdate, AgentScheduleResponse
from app.services.encryption_service import encrypt_value, decrypt_value
from app.scheduler import scheduler
from .auth import check_system_admin
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import sys
import os

# Import from scripts directory
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'scripts'))
try:
    from snmp_scanner import run_scanner
except ImportError:
    # Fallback: define a stub function if import fails
    async def run_scanner(cidr: str = None, community: str = None):
        raise NotImplementedError("SNMP scanner not available")

router = APIRouter(
    prefix="/agents",
    tags=["agents"]
)

SENSITIVE_KEYS = ['communityString', 'password', 'apiKey', 'secretKey', 'token', 'authKey', 'privKey']

@router.get("/{agent_id}/config", response_model=Dict[str, Any])
async def get_agent_config(
    agent_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_system_admin)
):
    """Retrieve configuration for a specific agent"""
    try:
        result = await db.execute(
            select(AgentConfiguration).where(AgentConfiguration.agent_id == agent_id)
        )
        config_rows = result.scalars().all()
        
        config_dict = {}
        for row in config_rows:
            # Decrypt sensitive values
            if row.is_sensitive:
                try:
                    value = decrypt_value(row.config_value)
                except Exception:
                    value = row.config_value # Fallback
            else:
                value = row.config_value
                
            config_dict[row.config_key] = value
        
        return config_dict
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{agent_id}/config", response_model=Dict[str, str])
async def update_agent_config(
    agent_id: str,
    update_data: AgentConfigUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_system_admin)
):
    """Update agent configuration with validation and encryption"""
    config = update_data.config
    
    try:
        # Validate SNMP specific config if applicable
        if agent_id == 'agent-snmp':
            # Basic validation
            if 'networkRange' in config and not validate_cidr(config['networkRange']):
                raise HTTPException(status_code=400, detail="Invalid CIDR format")
                
        for key, value in config.items():
            is_sensitive = key in SENSITIVE_KEYS
            
            # Encrypt if sensitive
            if is_sensitive and value:
                stored_value = encrypt_value(str(value))
            else:
                stored_value = str(value)
            
            # Check if exists to update or insert
            stmt = select(AgentConfiguration).where(
                AgentConfiguration.agent_id == agent_id,
                AgentConfiguration.config_key == key
            )
            result = await db.execute(stmt)
            existing = result.scalars().first()
            
            if existing:
                existing.config_value = stored_value
                existing.is_sensitive = is_sensitive
                existing.updated_at = func.now()
            else:
                new_config = AgentConfiguration(
                    agent_id=agent_id,
                    config_key=key,
                    config_value=stored_value,
                    is_sensitive=is_sensitive
                )
                db.add(new_config)
        
        await db.commit()
        return {"status": "success", "message": "Configuration updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{agent_id}/config/validate", response_model=AgentValidationResponse)
async def validate_agent_config(
    agent_id: str,
    update_data: AgentConfigUpdate,
    admin_user = Depends(check_system_admin)
):
    """Validate configuration without saving"""
    config = update_data.config
    
    if agent_id == 'agent-snmp':
        cidr = config.get('networkRange')
        if cidr and not validate_cidr(cidr):
            return AgentValidationResponse(valid=False, error="Invalid CIDR format")
            
        community = config.get('communityString')
        if not community:
            return AgentValidationResponse(valid=False, error="Community string required")
            
    return AgentValidationResponse(valid=True, message="Configuration valid")

def validate_cidr(cidr: str) -> bool:
    import re
    # Simple regex for CIDR
    pattern = r'^([0-9]{1,3}\.){3}[0-9]{1,3}(\/([0-9]|[1-2][0-9]|3[0-2]))?$'
    return bool(re.match(pattern, cidr))


# --- Scheduling Logic ---

async def run_snmp_scan_job():
    print(f"[*] Starting Scheduled SNMP Scan: {datetime.now()}")
    try:
        await run_scanner()
        
        # Update last_run
        async with AsyncSessionLocal() as session:
            stmt = select(AgentSchedule).where(AgentSchedule.agent_id == 'agent-local')
            result = await session.execute(stmt)
            schedule = result.scalars().first()
            if schedule:
                schedule.last_run = datetime.now()
                await session.commit()
    except Exception as e:
        print(f"[!] Scheduled Scan Failed: {e}")

JOB_MAPPINGS = {
    'agent-local': run_snmp_scan_job
}

@router.get("/{agent_id}/schedule", response_model=AgentScheduleResponse)
async def get_agent_schedule(
    agent_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_system_admin)
):
    """Get active schedule for agent"""
    result = await db.execute(
        select(AgentSchedule).where(AgentSchedule.agent_id == agent_id)
    )
    schedule = result.scalars().first()
    
    if not schedule:
        return AgentScheduleResponse(
            agent_id=agent_id,
            cron_expression="",
            is_enabled=False
        )
    
    # Inject next_run from scheduler memory
    job = scheduler.get_job(f"scan_{agent_id}")
    if job:
        schedule.next_run = job.next_run_time
        
    return schedule

@router.post("/{agent_id}/schedule", response_model=AgentScheduleResponse)
async def update_agent_schedule(
    agent_id: str,
    update_data: AgentScheduleUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_system_admin)
):
    """Update agent schedule and reconfigure APScheduler"""
    
    # 1. Update Database
    stmt = select(AgentSchedule).where(AgentSchedule.agent_id == agent_id)
    result = await db.execute(stmt)
    schedule = result.scalars().first()
    
    if schedule:
        schedule.cron_expression = update_data.cron_expression
        schedule.is_enabled = update_data.is_enabled
        schedule.updated_at = func.now()
    else:
        schedule = AgentSchedule(
            agent_id=agent_id,
            cron_expression=update_data.cron_expression,
            is_enabled=update_data.is_enabled
        )
        db.add(schedule)
    
    await db.commit()
    await db.refresh(schedule)
    
    # 2. Update Scheduler
    job_id = f"scan_{agent_id}"
    
    # Remove existing job
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
        
    # Add new job if enabled and supported
    if schedule.is_enabled and agent_id in JOB_MAPPINGS:
        job_func = JOB_MAPPINGS[agent_id]
        try:
            if not schedule.cron_expression:
                raise ValueError("Cron expression required when enabled")
                
            trigger = CronTrigger.from_crontab(schedule.cron_expression)
            
            scheduler.add_job(
                job_func,
                trigger=trigger,
                id=job_id,
                replace_existing=True
            )
        except ValueError as e:
            # Revert DB change if scheduler fails? Or just warn?
            # Better to error out
            raise HTTPException(status_code=400, detail=f"Invalid cron expression: {str(e)}")
            
    return schedule


@router.get("/scans", response_model=List[Dict[str, Any]])
async def get_discovery_scans(
    limit: int = 50,
    agent_id: str = None,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_system_admin)
):
    """Retrieve recent discovery scan sessions"""
    try:
        query = select(DiscoveryScan).order_by(DiscoveryScan.start_time.desc()).limit(limit)
        
        if agent_id:
            query = query.where(DiscoveryScan.agent_id == agent_id)
        
        result = await db.execute(query)
        scans = result.scalars().all()
        
        return [
            {
                "id": str(scan.id),
                "agent_id": scan.agent_id,
                "scan_type": scan.scan_type,
                "status": scan.status,
                "start_time": scan.start_time.isoformat() if scan.start_time else None,
                "end_time": scan.end_time.isoformat() if scan.end_time else None,
                "assets_processed": scan.assets_processed,
                "errors": scan.errors,
                "metadata": scan.metadata_
            }
            for scan in scans
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scans/{scan_id}/diffs", response_model=List[Dict[str, Any]])
async def get_scan_diffs(
    scan_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_system_admin)
):
    """Retrieve configuration changes detected during a specific scan"""
    try:
        result = await db.execute(
            select(DiscoveryDiff, Asset)
            .join(Asset, DiscoveryDiff.asset_id == Asset.id)
            .where(DiscoveryDiff.scan_id == uuid.UUID(scan_id))
            .order_by(DiscoveryDiff.detected_at.desc())
        )
        rows = result.all()
        
        return [
            {
                "id": str(diff.id),
                "asset_id": str(diff.asset_id),
                "asset_name": asset.name,
                "field_name": diff.field_name,
                "old_value": diff.old_value,
                "new_value": diff.new_value,
                "detected_at": diff.detected_at.isoformat() if diff.detected_at else None
            }
            for diff, asset in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/assets/{asset_id}/history", response_model=List[Dict[str, Any]])
async def get_asset_change_history(
    asset_id: str,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_system_admin)
):
    """Retrieve configuration change history for a specific asset"""
    try:
        result = await db.execute(
            select(DiscoveryDiff)
            .where(DiscoveryDiff.asset_id == uuid.UUID(asset_id))
            .order_by(DiscoveryDiff.detected_at.desc())
            .limit(limit)
        )
        diffs = result.scalars().all()
        
        return [
            {
                "id": str(diff.id),
                "scan_id": str(diff.scan_id),
                "field_name": diff.field_name,
                "old_value": diff.old_value,
                "new_value": diff.new_value,
                "detected_at": diff.detected_at.isoformat() if diff.detected_at else None
            }
            for diff in diffs
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
