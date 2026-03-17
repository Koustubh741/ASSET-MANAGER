import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone

# Add parent directory to path to reach app module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import AsyncSessionLocal
from app.services import discovery_service
from app.schemas.discovery_schema import DiscoveryPayload, DiscoveryHardware, DiscoveryOS

async def verify_fix():
    print("[*] Starting Verification of SNMP Discovery Fix...")
    
    # Mock payload with missing model/vendor and a neighbor
    payload = DiscoveryPayload(
        agent_id=uuid.uuid4(),
        scan_id=uuid.uuid4(),
        hostname="Test-Device-Integrity-Fix",
        ip_address="192.168.1.50",
        hardware=DiscoveryHardware(
            cpu="Intel Test CPU",
            ram_mb=8192,
            serial=f"TEST-SERIAL-{uuid.uuid4().hex[:6]}",
            model="", # Empty model (was None in DB which caused error)
            vendor="", # Empty vendor
            type="Desktop"
        ),
        os=DiscoveryOS(
            name="TestOS",
            version="1.0",
            uptime_sec=3600
        ),
        neighbors=[
            {"neighbor_name": f"NSW_STUB_TEST_{uuid.uuid4().hex[:6]}", "neighbor_port": "Gi0/1"}
        ]
    )

    print(f"[*] Testing with hostname: {payload.hostname}")
    print(f"[*] Testing with neighbor: {payload.neighbors[0]['neighbor_name']}")

    async with AsyncSessionLocal() as db:
        try:
            # This should have failed before the fix with NotNullViolationError
            asset = await discovery_service.process_discovery_payload(db, payload)
            
            print(f"\n[SUCCESS] Main asset processed: {asset.name} (ID: {asset.id})")
            print(f"  - Model: {asset.model}")
            print(f"  - Vendor: {asset.vendor}")
            
            # Check for the stub asset
            from sqlalchemy import select
            from app.models.models import Asset
            
            neighbor_name = payload.neighbors[0]["neighbor_name"]
            result = await db.execute(select(Asset).filter(Asset.name == neighbor_name))
            stub = result.scalars().first()
            
            if stub:
                print(f"[SUCCESS] Stub asset created: {stub.name} (ID: {stub.id})")
                print(f"  - Model: {stub.model}")
                print(f"  - Vendor: {stub.vendor}")
                print(f"  - Serial: {stub.serial_number}")
            else:
                print(f"[FAILURE] Stub asset not found for {neighbor_name}")
                
            # Rollback to keep DB clean if needed, or commit to see it in DB
            # For verification, we want to see it successfully reach this point.
            await db.rollback()
            print("\n[*] Test completed successfully (rolled back).")
            
        except Exception as e:
            print(f"\n[FAILURE] Error during verification: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(verify_fix())
