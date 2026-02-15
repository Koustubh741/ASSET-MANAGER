from fastapi import APIRouter, Depends, HTTPException, status, Header, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from ..database.database import get_db, get_db_context
from ..models.models import AuditLog
import uuid as uuid_lib
from ..services import discovery_service, snmp_service, software_service, user_sync_service, barcode_service
from ..schemas.discovery_schema import DiscoveryPayload, SaaSDiscoveryPayload, UserSyncPayload, BarcodeScanPayload
from .auth import check_system_admin
import os
import logging
import subprocess
import sys
import ipaddress
from pydantic import BaseModel
from typing import Dict, Optional, List, Any, Callable, Awaitable
from datetime import datetime, timezone

# In-memory storage for active scan jobs
SCAN_JOBS: Dict[str, Dict[str, Any]] = {}

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/collect",
    tags=["discovery"]
)

def execute_agent_script(script_name: str, args: List[str] = None):
    """
    Execute a discovery agent script in the background.
    """
    try:
        # Get the path to the scripts directory
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        script_path = os.path.join(base_dir, "scripts", script_name)
        log_file = os.path.join(base_dir, "agent_execution.log")
        
        if not os.path.exists(script_path):
            logger.error(f"Agent script not found: {script_path}")
            return False
            
        # Use the same python executable as the backend
        python_exe = sys.executable
        cmd = [python_exe, script_path]
        if args:
            cmd.extend(args)
            
        logger.info(f"Triggering agent execution: {' '.join(cmd)}")
        
        # Open log file for appending
        log_handle = open(log_file, "a")
        log_handle.write(f"\n--- [{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Launching {script_name} ---\n")
        log_handle.flush()
        
        # Run in background without blocking
        subprocess.Popen(
            cmd,
            stdout=log_handle,
            stderr=log_handle,
            cwd=base_dir, # Ensure scripts run from backend root
            start_new_session=True if os.name != 'nt' else 0,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
        )
        return True
    except Exception as e:
        logger.error(f"Failed to trigger agent script {script_name}: {str(e)}")
        return False

class ServerScanPayload(BaseModel):
    targets: Optional[str] = None # Comma separated IPs or CIDR
    os_type: Optional[str] = None # "windows" or "linux"
    credentials: Optional[Dict[str, str]] = None # username, password, private_key
    agent_id: Optional[str] = "agent-server"

class ScanValidatePayload(BaseModel):
    test_ip: str
    community: Optional[str] = None

class ScanTriggerPayload(BaseModel):
    cidr: Optional[str] = None
    community: Optional[str] = None

import hmac
import hashlib

async def verify_agent_token(
    x_agent_key: Optional[str] = Header(None),
    x_agent_signature: Optional[str] = Header(None),
    x_agent_timestamp: Optional[str] = Header(None),
    x_agent_id: Optional[str] = Header(None)
):
    """
    Verify agent authentication. Supports:
    1. Legacy token-based auth (X-Agent-Key)
    2. Modern HMAC request signing (X-Agent-Signature)
    """
    expected_secret = os.getenv("AGENT_SECRET", "agent_secret_key_2026")
    
    # 1. Try Modern HMAC Auth
    if x_agent_signature and x_agent_timestamp and x_agent_id:
        try:
            # Verify timestamp is recent (within 5 minutes) to prevent replay attacks
            request_time = datetime.fromisoformat(x_agent_timestamp.replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            if abs((now - request_time).total_seconds()) > 300:
                logger.warning(f"Rejected expired signature from agent {x_agent_id}")
                raise HTTPException(status_code=401, detail="Signature expired")

            # Reconstruct signature
            message = f"{x_agent_id}:{x_agent_timestamp}"
            expected_sig = hmac.new(
                expected_secret.encode(),
                message.encode(),
                hashlib.sha256
            ).hexdigest()

            if hmac.compare_digest(x_agent_signature, expected_sig):
                return True
                
            logger.warning(f"Invalid HMAC signature from agent {x_agent_id}")
        except Exception as e:
            logger.error(f"HMAC verification error: {str(e)}")

    # 2. Fallback to Legacy Key Auth
    if x_agent_key == expected_secret:
        return True

    logger.warning("Agent authentication failed: No valid credentials provided")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid agent authentication"
    )

@router.post("/metrics", response_model=dict)
async def collect_agent_metrics(
    payload: Dict[str, Any],
    authenticated: bool = Depends(verify_agent_token)
):
    """
    Receive and store operational metrics from discovery agents.
    """
    try:
        agent_id = payload.get("agent_id", "unknown")
        logger.info(f"Received metrics from agent {agent_id}")
        
        
        
        async with get_db_context() as db:
            audit = AuditLog(
                id=uuid_lib.uuid4(),
                action="AGENT_METRICS",
                entity_type="Agent",
                entity_id=str(agent_id),
                details=payload,
                timestamp=datetime.now(timezone.utc)
            )
            db.add(audit)
            await db.commit()
            
        return {"status": "success", "message": "Metrics recorded"}
    except Exception as e:
        logger.error(f"Failed to record agent metrics: {str(e)}")
        return {"status": "partial_success", "message": str(e)}

@router.get("/metrics/{agent_id}", response_model=Dict[str, Any])
async def get_agent_metrics(
    agent_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_system_admin)
):
    """
    Retrieve the latest operational metrics for a specific agent.
    """
    try:
        from sqlalchemy import select, desc
        
        result = await db.execute(
            select(AuditLog)
            .where(AuditLog.entity_type == "Agent")
            .where(AuditLog.entity_id == agent_id)
            .where(AuditLog.action == "AGENT_METRICS")
            .order_by(desc(AuditLog.timestamp))
            .limit(1)
        )
        log_entry = result.scalars().first()
        
        if not log_entry:
            return {"status": "error", "message": f"No metrics found for agent {agent_id}"}
            
        return {
            "status": "success",
            "agent_id": agent_id,
            "timestamp": log_entry.timestamp,
            "metrics": log_entry.details
        }
    except Exception as e:
        logger.error(f"Failed to fetch agent metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", response_model=dict)
async def collect_discovery_data(
    payload: DiscoveryPayload,
    db: AsyncSession = Depends(get_db),
    authenticated: bool = Depends(verify_agent_token)
):
    """
    Receive and process discovery data from agents.
    
    This endpoint accepts hardware, software, and OS information from discovery agents
    and creates or updates assets in the system.
    """
    try:
        logger.info(f"Processing discovery payload for {payload.hostname} (SN: {payload.hardware.serial})")
        
        # Process the discovery payload
        asset = await discovery_service.process_discovery_payload(db, payload)
        
        audit = AuditLog(
            id=uuid_lib.uuid4(),
            action="asset_discovered",
            entity_type="Asset",
            entity_id=str(asset.id),
            details={
                "hostname": payload.hostname,
                "serial": payload.hardware.serial,
                "agent_id": str(payload.agent_id),
                "ip_address": payload.ip_address,
                "software_count": len(payload.software) if payload.software else 0
            }
        )
        db.add(audit)
        await db.commit()
        
        logger.info(f"Successfully processed asset {asset.name} (ID: {asset.id})")
        
        return {
            "status": "success",
            "message": f"Asset {asset.name} processed successfully",
            "asset_id": str(asset.id),
            "action": "updated" if asset.updated_at else "created"
        }
        
    except Exception as e:
        logger.error(f"Discovery processing error: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process discovery data: {str(e)}"
        )

@router.post("/trigger", response_model=dict)
async def trigger_discovery_sweep(
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_system_admin)
):
    """
    Manually trigger a local discovery sweep.
    """
    if execute_agent_script("discovery_agent.py"):
        return {
            "status": "success",
            "message": "Local discovery agent triggered successfully"
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to start local discovery agent")

async def _run_snmp_scan_background(
    scan_id: str,
    cidr: str,
    community: str,
    v3_data: dict,
    context_name: str,
    admin_email: str
):
    """
    Background task to execute SNMP scan and save results.
    """
    from ..database.database import AsyncSessionLocal
    from ..schemas.discovery_schema import DiscoveryPayload, DiscoveryHardware, DiscoveryOS
    import uuid
    
    async with AsyncSessionLocal() as db:
        try:
            logger.info(f"[Background] Starting SNMP scan on {cidr} for {admin_email}")
            
            # Update job status
            SCAN_JOBS[scan_id]["status"] = "running"
            SCAN_JOBS[scan_id]["started_at"] = datetime.now(timezone.utc).isoformat()
            
            # Progress callback
            async def progress_cb():
                if scan_id in SCAN_JOBS:
                    SCAN_JOBS[scan_id]["scanned_hosts"] += 1
                    SCAN_JOBS[scan_id]["updated_at"] = datetime.now(timezone.utc).isoformat()
            
            devices = await snmp_service.scan_network_range(
                cidr, community, v3_data, context_name, progress_cb=progress_cb
            )
            
            count = 0
            for dev in devices:
                payload = DiscoveryPayload(
                    agent_id="00000000-0000-0000-0000-000000000000",
                    hostname=dev["name"],
                    ip_address=dev["ip_address"],
                    hardware=DiscoveryHardware(
                        cpu="Network CPU",
                        ram_mb=0,
                        serial=dev["serial_number"],
                        model=dev["model"],
                        vendor=dev["vendor"],
                        type=dev["type"]
                    ),
                    os=DiscoveryOS(
                        name="Embedded/Firmware",
                        version="Unknown",
                        uptime_sec=0
                    )
                )
                asset = await discovery_service.process_discovery_payload(db, payload)
                asset.specifications = dev["specifications"]
                count += 1
            
            await db.commit()
            logger.info(f"[Background] SNMP scan complete: {count} devices discovered")
            
            # Mark job complete
            SCAN_JOBS[scan_id]["status"] = "completed"
            SCAN_JOBS[scan_id]["devices_found"] = count
            SCAN_JOBS[scan_id]["completed_at"] = datetime.now(timezone.utc).isoformat()
            
        except Exception as e:
            logger.error(f"[Background] SNMP scan failed: {str(e)}", exc_info=True)
            await db.rollback()
            
            # Mark job failed
            SCAN_JOBS[scan_id]["status"] = "failed"
            SCAN_JOBS[scan_id]["error"] = str(e)
            SCAN_JOBS[scan_id]["completed_at"] = datetime.now(timezone.utc).isoformat()


@router.post("/scan", response_model=dict)
async def trigger_network_scan(
    background_tasks: BackgroundTasks,
    payload: ScanTriggerPayload,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_system_admin)
):
    """
    Trigger an agentless SNMP network scan sweep (async background execution).
    """
    try:
        from ..models.models import AgentConfiguration
        from ..services.encryption_service import decrypt_value
        from sqlalchemy import select
        
        cidr = payload.cidr
        community = payload.community

        # 1. Fetch Configuration from Database if not provided
        v3_data = None
        context_name = ""
        if not cidr or not community:
            result = await db.execute(
                select(AgentConfiguration).where(AgentConfiguration.agent_id == 'agent-snmp')
            )
            config_rows = result.scalars().all()
            config = {row.config_key: row for row in config_rows}
            
            if not cidr and 'networkRange' in config:
                cidr = config['networkRange'].config_value
            
            if 'contextName' in config:
                context_name = config['contextName'].config_value

            # Auto-detect v3 vs v2c
            version = config.get('snmpVersion').config_value if 'snmpVersion' in config else 'v2c'
            
            if version == 'v3':
                v3_data = {}
                v3_keys = ['username', 'authKey', 'authProtocol', 'privKey', 'privProtocol']
                for k in v3_keys:
                    if k in config:
                        row = config[k]
                        v3_data[k] = decrypt_value(row.config_value) if row.is_sensitive else row.config_value
            else:
                if not community and 'communityString' in config:
                    row = config['communityString']
                    community = decrypt_value(row.config_value) if row.is_sensitive else row.config_value

        # Fallbacks for safety
        cidr = cidr or "192.168.1.0/24"
        community = community or "public"

        # Count total IPs in range for the response
        try:
            net = ipaddress.ip_network(cidr, strict=False)
            total_ips = len(list(net.hosts()))
        except:
            total_ips = 0

        logger.info(f"Admin {admin_user.email} triggered SNMP scan on {cidr} (Version: {'v3' if v3_data else 'v2c'})")
        
        # Launch scan in background
        scan_id = str(uuid_lib.uuid4())
        SCAN_JOBS[scan_id] = {
            "scan_id": scan_id,
            "cidr": cidr,
            "total_hosts": total_ips,
            "scanned_hosts": 0,
            "devices_found": 0,
            "status": "pending",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "initiated_by": admin_user.email
        }
        
        background_tasks.add_task(
            _run_snmp_scan_background,
            scan_id, cidr, community, v3_data, context_name, admin_user.email
        )
        
        message = f"SNMP scan started on {cidr} ({total_ips} hosts). Results will appear in the inventory shortly."
            
        return {
            "status": "success",
            "message": message,
            "scan_id": scan_id,

            "range": str(cidr),
            "total_hosts": total_ips,
            "async": True
        }
    except Exception as e:
        logger.error(f"Error during SNMP scan: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scan/validate", response_model=dict)
async def validate_snmp_config(
    payload: ScanValidatePayload,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_system_admin)
):
    """
    Validate SNMP credentials by testing against a single IP.
    Returns success if the device responds, error otherwise.
    """
    try:
        from ..models.models import AgentConfiguration
        from ..services.encryption_service import decrypt_value
        from sqlalchemy import select
        
        test_ip = payload.test_ip
        community = payload.community
        
        # Fetch configuration from database if not provided
        v3_data = None
        context_name = ""
        
        if not community:
            result = await db.execute(
                select(AgentConfiguration).where(AgentConfiguration.agent_id == 'agent-snmp')
            )
            config_rows = result.scalars().all()
            config = {row.config_key: row for row in config_rows}
            
            if 'contextName' in config:
                context_name = config['contextName'].config_value
            
            # Auto-detect v3 vs v2c
            version = config.get('snmpVersion').config_value if 'snmpVersion' in config else 'v2c'
            
            if version == 'v3':
                v3_data = {}
                v3_keys = ['username', 'authKey', 'authProtocol', 'privKey', 'privProtocol']
                for k in v3_keys:
                    if k in config:
                        row = config[k]
                        v3_data[k] = decrypt_value(row.config_value) if row.is_sensitive else row.config_value
            else:
                if 'communityString' in config:
                    row = config['communityString']
                    community = decrypt_value(row.config_value) if row.is_sensitive else row.config_value
        
        # Fallback
        community = community or "public"
        
        logger.info(f"Admin {admin_user.email} validating SNMP config against {test_ip}")
        
        # Test against single IP using /32 CIDR
        devices = await snmp_service.scan_network_range(f"{test_ip}/32", community, v3_data, context_name)
        
        if devices and len(devices) > 0:
            device = devices[0]
            return {
                "status": "success",
                "message": f"✓ Credentials verified! Device responded: {device.get('name', test_ip)}",
                "device_info": {
                    "name": device.get("name"),
                    "vendor": device.get("vendor"),
                    "type": device.get("type"),
                    "description": device.get("specifications", {}).get("Description", "")[:100]
                }
            }
        else:
            return {
                "status": "error",
                "message": f"✗ No response from {test_ip}. Check credentials, firewall rules, or verify SNMP is enabled on the device."
            }
            
    except Exception as e:
        logger.error(f"Validation error: {str(e)}", exc_info=True)
        return {
            "status": "error",
            "message": f"Validation failed: {str(e)}"
        }

@router.get("/scan/status/{scan_id}", response_model=Dict[str, Any])
async def get_scan_status(
    scan_id: str,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_system_admin)
):
    """
    Get the status of an async network scan.
    """
    if scan_id not in SCAN_JOBS:
        raise HTTPException(status_code=404, detail="Scan job not found")
        
    job = SCAN_JOBS[scan_id]
    
    # Calculate progress percentage (approximate)
    progress = 0
    if job["total_hosts"] > 0:
        progress = int((job["scanned_hosts"] / job["total_hosts"]) * 100)
        
    return {
        "scan_id": job["scan_id"],
        "status": job["status"],
        "progress_percent": min(progress, 100),
        "scanned_hosts": job["scanned_hosts"],
        "total_hosts": job["total_hosts"],
        "devices_found": job["devices_found"],
        "started_at": job["started_at"],
        "completed_at": job.get("completed_at")
    }

@router.post("/cloud/sync", response_model=dict)
async def trigger_cloud_sync(
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_system_admin)
):
    """
    Manually trigger a cloud discovery sweep.
    """
    if execute_agent_script("cloud_discovery_agent.py"):
        return {
            "status": "success",
            "message": "Cloud discovery agent triggered successfully",
            "triggered_at": datetime.now(timezone.utc).isoformat()
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to start cloud discovery agent")

@router.post("/saas", response_model=dict)
async def collect_saas_data(
    payload: SaaSDiscoveryPayload,
    db: AsyncSession = Depends(get_db),
    authenticated: bool = Depends(verify_agent_token)
):
    """
    Receive and process SaaS license data from agents.
    """
    try:
        logger.info(f"Processing SaaS discovery payload for {payload.platform}")
        
        results = []
        for item in payload.licenses:
            license_dict = item.model_dump()
            # Convert expiry_date string to date object if present
            if license_dict.get("expiry_date"):
                try:
                    license_dict["expiry_date"] = datetime.strptime(license_dict["expiry_date"], "%Y-%m-%d").date()
                except ValueError:
                    license_dict["expiry_date"] = None
                    
            db_license = await software_service.upsert_saas_license(db, license_dict)
            results.append(str(db_license.id))
            
        return {
            "status": "success",
            "message": f"Processed {len(results)} SaaS licenses for {payload.platform}",
            "ids": results
        }
    except Exception as e:
        logger.error(f"SaaS discovery error: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process SaaS data: {str(e)}"
        )

@router.post("/saas/trigger", response_model=dict)
async def trigger_saas_sync(
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_system_admin)
):
    """
    Manually trigger a SaaS license discovery sweep.
    """
    if execute_agent_script("saas_discovery_agent.py"):
        return {
            "status": "success",
            "message": "SaaS discovery agent triggered successfully"
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to start SaaS discovery agent")

@router.post("/users", response_model=dict)
async def collect_user_sync_data(
    payload: UserSyncPayload,
    db: AsyncSession = Depends(get_db),
    authenticated: bool = Depends(verify_agent_token)
):
    """
    Receive and process bulk user synchronization data from AD/LDAP agents.
    """
    try:
        logger.info(f"Processing Directory Sync payload from {payload.source_domain}")
        results = await user_sync_service.sync_ad_users(db, payload)
        return {
            "status": "success",
            "message": f"Successfully synced {results['created']} new and {results['updated']} existing users",
            "results": results
        }
    except Exception as e:
        logger.error(f"User sync error: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process user sync data: {str(e)}"
        )

@router.post("/users/trigger", response_model=dict)
async def trigger_user_sync(
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_system_admin)
):
    """
    Manually trigger an AD/LDAP sync sweep.
    """
    if execute_agent_script("ad_sync_agent.py"):
        return {
            "status": "success",
            "message": "AD/LDAP sync agent triggered successfully"
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to start AD/LDAP sync agent")

@router.post("/barcode", response_model=dict)
async def collect_barcode_scan(
    payload: BarcodeScanPayload,
    db: AsyncSession = Depends(get_db),
    authenticated: bool = Depends(verify_agent_token)
):
    """
    Receive and process a barcode/QR scan from a field technician.
    """
    try:
        logger.info(f"Processing Barcode Scan for Serial: {payload.serial_number}")
        result = await barcode_service.process_barcode_scan(db, payload)
        return result
    except Exception as e:
        logger.error(f"Barcode scan error: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process barcode scan: {str(e)}"
        )

@router.get("/debug/jobs", response_model=dict)
async def debug_get_scan_jobs(
    admin_user = Depends(check_system_admin)
):
    """
    Debug endpoint to view all active and recent scan jobs.
    """
    return SCAN_JOBS

@router.post("/server/scan", response_model=dict)
async def trigger_server_scan(
    # Triggering reload for new dependencies
    payload: ServerScanPayload,
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_system_admin)
):
    """
    Trigger a remote server scan (Agentless/Remote Execution).
    """
    try:
        from ..services.server_discovery_service import server_discovery_service
        from ..schemas.discovery_schema import DiscoveryPayload, DiscoveryHardware, DiscoveryOS
        from ..models.models import AgentConfiguration
        from ..services.encryption_service import decrypt_value
        from sqlalchemy import select
        import uuid
        
        targets_str = payload.targets
        os_type = payload.os_type
        creds = payload.credentials
        
        # Fallback to DB if missing
        if not targets_str or not os_type or not creds:
            result = await db.execute(
                select(AgentConfiguration).where(AgentConfiguration.agent_id == payload.agent_id)
            )
            config_rows = result.scalars().all()
            config = {row.config_key: row for row in config_rows}
            
            if not targets_str and 'targets' in config:
                targets_str = config['targets'].config_value
            if not os_type and 'osType' in config:
                os_type = config['osType'].config_value
            if not creds:
                creds = {}
                keys = ['username', 'password', 'privateKey']
                for k in keys:
                    if k in config:
                        row = config[k]
                        creds[k] = decrypt_value(row.config_value) if row.is_sensitive else row.config_value
                        
        if not targets_str:
            raise HTTPException(status_code=400, detail="Target IPs are required (not found in payload or DB)")

        targets = [ip.strip() for ip in targets_str.split(",")]
        results = []
        errors = []
        
        for ip in targets:
            try:
                # 1. Discover
                raw_data = await server_discovery_service.discover_server(ip, os_type, creds)
                
                # 2. Transform to Schema
                discovery_payload = DiscoveryPayload(
                    agent_id=uuid_lib.UUID("00000000-0000-0000-0000-000000000005"), # Dedicated server scanner ID
                    hostname=raw_data["hostname"],
                    ip_address=ip,
                    hardware=DiscoveryHardware(**raw_data["hardware"]),
                    os=DiscoveryOS(**raw_data["os"]),
                    software=raw_data["software"]
                )
                
                # 3. Process
                asset = await discovery_service.process_discovery_payload(db, discovery_payload)
                results.append({"ip": ip, "status": "success", "asset_id": str(asset.id), "hostname": asset.name})
                
            except Exception as e:
                logger.error(f"Failed to scan {ip}: {e}")
                errors.append({"ip": ip, "error": str(e)})
        
        await db.commit()
        
        return {
            "status": "success",
            "message": f"Scanned {len(targets)} targets. Success: {len(results)}, Failed: {len(errors)}",
            "results": results,
            "errors": errors
        }
            
    except Exception as e:
        logger.error(f"Server scan error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

