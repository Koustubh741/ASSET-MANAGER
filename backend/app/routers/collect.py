from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from ..database.database import get_db
from ..schemas.discovery_schema import DiscoveryPayload
from ..services import discovery_service, snmp_service
from .auth import check_system_admin
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/collect",
    tags=["discovery"]
)

async def verify_agent_token(x_agent_key: str = Header(...)):
    """
    Verify agent authentication token from X-Agent-Key header.
    """
    expected_key = os.getenv("AGENT_SECRET", "agent_secret_key_2026")
    if x_agent_key != expected_key:
        logger.warning(f"Invalid agent key attempted: {x_agent_key[:10]}...")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid agent authentication key"
        )
    return True

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
        
        # Log audit event
        from ..models.models import AuditLog
        import uuid as uuid_lib
        audit = AuditLog(
            id=str(uuid_lib.uuid4()),
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
        print(f"DEBUG: audit.id type: {type(audit.id)}, value: {audit.id}")
        print(f"DEBUG: audit.entity_id type: {type(audit.entity_id)}, value: {audit.entity_id}")
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

@router.post("/scan", response_model=dict)
async def trigger_network_scan(
    cidr: str = "192.168.1.0/24",
    community: str = "public",
    db: AsyncSession = Depends(get_db),
    admin_user = Depends(check_system_admin)
):
    """
    Trigger an agentless SNMP network scan sweep.
    """
    try:
        # We run this as a background task to avoid blocking the API
        # but for Prototype, we'll wait for it or use a simple task
        logger.info(f"Admin {admin_user.email} triggered SNMP scan on {cidr}")
        
        devices = await snmp_service.scan_network_range(cidr, community)
        
        count = 0
        for dev in devices:
            from ..schemas.discovery_schema import DiscoveryPayload, DiscoveryHardware, DiscoveryOS
            import uuid
            
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
        
        return {
            "status": "success",
            "message": f"Scan complete. Discovered {count} new devices.",
            "count": count
        }
    except Exception as e:
        logger.error(f"Error during SNMP scan: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Scan failed: {str(e)}"
        )
