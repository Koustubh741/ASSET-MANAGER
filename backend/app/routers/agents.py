
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, insert
from sqlalchemy.sql import func
from typing import Dict, Any, List
import uuid

from ..database.database import get_db, AsyncSessionLocal
from ..models.models import AgentConfiguration, AgentSchedule, DiscoveryScan, DiscoveryDiff, Asset, DiscoveryAgent
from ..schemas.agent_schema import AgentConfigUpdate, AgentConfigResponse, AgentValidationResponse, AgentScheduleUpdate, AgentScheduleResponse, DiscoveryAgentResponse, DiscoveryAgentUpdate
from ..services.encryption_service import encrypt_value, decrypt_value
from ..scheduler import scheduler
from .auth import check_ADMIN
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

SENSITIVE_KEYS = [
    # Legacy agent keys
    'communityString', 'password', 'apiKey', 'secretKey', 'token', 'authKey', 'privKey',
    # Cloud provider secrets
    'aws_secret_access_key',
    'azure_client_secret',
    'gcp_service_account_key',
    'oci_private_key',
]

@router.get("/{agent_id}/config", response_model=Dict[str, Any])
async def get_agent_config(
    agent_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_ADMIN)
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
    admin_user = Depends(check_ADMIN)
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
    admin_user = Depends(check_ADMIN)
):
    """Validate configuration without saving"""
    config = update_data.config
    
    if agent_id == 'agent-snmp':
        cidr = config.get('networkRange')
        if cidr and not validate_cidr(cidr):
            return AgentValidationResponse(valid=False, error="Invalid CIDR format")

        version = config.get('snmpVersion', 'v2c')
        if version == 'v3':
            if not config.get('username'):
                return AgentValidationResponse(valid=False, error="SNMPv3: Username is required")
            # Auth key required if priv key is set
            if config.get('privKey') and not config.get('authKey'):
                return AgentValidationResponse(valid=False, error="SNMPv3: Auth key required when privacy is enabled")
        else:
            if not config.get('communityString'):
                return AgentValidationResponse(valid=False, error="SNMPv2c: Community string is required")

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
        
        # FIX BUG 4: Update last_run on the correct agent schedule (agent-snmp, not agent-local)
        async with AsyncSessionLocal() as session:
            stmt = select(AgentSchedule).where(AgentSchedule.agent_id == 'agent-snmp')
            result = await session.execute(stmt)
            schedule = result.scalars().first()
            if schedule:
                schedule.last_run = datetime.now()
                await session.commit()
    except Exception as e:
        print(f"[!] Scheduled Scan Failed: {e}")

async def run_cloud_sync_job():
    """Scheduled job to trigger cloud provider discovery."""
    print(f"[*] Starting Scheduled Cloud Sync: {datetime.now()}")
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        script_path = os.path.join(base_dir, "scripts", "cloud_discovery_agent.py")
        import sys as _sys
        import subprocess as _subprocess
        log_file = os.path.join(base_dir, "agent_execution.log")
        with open(log_file, "a") as log_handle:
            log_handle.write(f"\n--- [{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Scheduled cloud sync ---\n")
            _subprocess.Popen(
                [_sys.executable, script_path],
                stdout=log_handle,
                stderr=log_handle,
                cwd=base_dir,
                creationflags=_subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
            )
        # Update last_run
        async with AsyncSessionLocal() as session:
            stmt = select(AgentSchedule).where(AgentSchedule.agent_id == 'agent-cloud')
            result = await session.execute(stmt)
            schedule = result.scalars().first()
            if schedule:
                schedule.last_run = datetime.now()
                await session.commit()
    except Exception as e:
        print(f"[!] Cloud Sync Job Failed: {e}")

# FIX BUG 3: Map 'agent-snmp' (not 'agent-local') to the SNMP scan job
JOB_MAPPINGS = {
    'agent-snmp': run_snmp_scan_job,
    'agent-cloud': run_cloud_sync_job,
}

@router.get("/{agent_id}/schedule", response_model=AgentScheduleResponse)
async def get_agent_schedule(
    agent_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_ADMIN)
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
    admin_user = Depends(check_ADMIN)
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
    admin_user = Depends(check_ADMIN)
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
    admin_user = Depends(check_ADMIN)
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
    admin_user = Depends(check_ADMIN)
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

# --- Discovery Agent Registry ---

@router.get("/registry", response_model=List[DiscoveryAgentResponse])
async def get_agent_registry(
    db: AsyncSession = Depends(get_db)
):
    """Retrieve the list of all discovery agents from the registry"""
    try:
        result = await db.execute(select(DiscoveryAgent).order_by(DiscoveryAgent.name))
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/registry/{agent_id}", response_model=DiscoveryAgentResponse)
async def update_agent_registry_status(
    agent_id: str,
    update_data: DiscoveryAgentUpdate,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_ADMIN)
):
    """Update an agent's status, health, or last sync time"""
    try:
        result = await db.execute(select(DiscoveryAgent).where(DiscoveryAgent.id == agent_id))
        agent = result.scalars().first()
        
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found in registry")
            
        update_dict = update_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(agent, key, value)
            
        await db.commit()
        await db.refresh(agent)
        return agent
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ── Internal endpoint for agent self-fetch of cloud credentials ──────────────
from fastapi import Request as _Request
import hmac as _hmac, hashlib as _hashlib, time as _time

CLOUD_SENSITIVE_KEYS = {
    'aws_secret_access_key', 'azure_client_secret', 'gcp_service_account_key', 'oci_private_key'
}

@router.get("/{agent_id}/config/internal", response_model=Dict[str, str])
async def get_agent_config_internal(
    agent_id: str,
    request: _Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Internal endpoint called by the cloud discovery agent at startup to fetch
    its stored credentials. Authenticated via HMAC-SHA256 using AGENT_SECRET.
    """
    agent_secret = os.getenv("AGENT_SECRET", "")

    timestamp = request.headers.get("X-Agent-Timestamp", "")
    signature = request.headers.get("X-Agent-Signature", "")
    caller_id = request.headers.get("X-Agent-ID", "")

    # Validate caller matches requested agent_id
    if caller_id != agent_id:
        raise HTTPException(status_code=403, detail="Agent ID mismatch")

    # Validate timestamp is within ±60 seconds
    try:
        ts = int(timestamp)
        if abs(_time.time() - ts) > 60:
            raise HTTPException(status_code=403, detail="Timestamp expired")
    except (ValueError, TypeError):
        raise HTTPException(status_code=403, detail="Invalid timestamp")

    # Validate HMAC signature
    path = f"/api/v1/agents/{agent_id}/config/internal"
    expected_sig = _hmac.new(
        agent_secret.encode(),
        f"{timestamp}:{path}".encode(),
        _hashlib.sha256
    ).hexdigest()
    if not _hmac.compare_digest(expected_sig, signature):
        raise HTTPException(status_code=403, detail="Invalid signature")

    # Fetch and decrypt config
    try:
        result = await db.execute(
            select(AgentConfiguration).where(AgentConfiguration.agent_id == agent_id)
        )
        rows = result.scalars().all()
        config: Dict[str, str] = {}
        for row in rows:
            if row.is_sensitive:
                try:
                    config[row.config_key] = decrypt_value(row.config_value)
                except Exception:
                    config[row.config_key] = row.config_value
            else:
                config[row.config_key] = row.config_value
        return config
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
