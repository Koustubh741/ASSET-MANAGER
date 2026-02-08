import asyncio
import sys
import os
import uuid
from datetime import datetime

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.database import AsyncSessionLocal
from app.services.discovery_service import process_discovery_payload
from app.schemas.discovery_schema import DiscoveryPayload, DiscoveryHardware, DiscoveryOS, DiscoverySoftware

async def verify_software_discovery():
    print("[*] Starting Software Discovery Verification...")
    
    # Mock payload with software list
    payload = DiscoveryPayload(
        agent_id=uuid.uuid4(),
        hostname="VERIFY-SOFT-HOST",
        ip_address="192.168.1.50",
        hardware=DiscoveryHardware(
            cpu="Verification CPU",
            ram_mb=8192,
            serial="VERIFY-SOFT-SN-001",
            model="SoftVerifier-X",
            vendor="VerifierCorp",
            type="Desktop"
        ),
        os=DiscoveryOS(
            name="Windows",
            version="10.0.19045",
            uptime_sec=3600
        ),
        software=[
            DiscoverySoftware(name="Google Chrome", version="120.0.6099.110", vendor="Google LLC"),
            DiscoverySoftware(name="Python 3.12.1", version="3.12.1", vendor="Python Software Foundation"),
            DiscoverySoftware(name="Visual Studio Code", version="1.85.1", vendor="Microsoft Corporation")
        ]
    )
    
    async with AsyncSessionLocal() as db:
        print("[*] Processing payload...")
        asset = await process_discovery_payload(db, payload)
        
        # Verify if software was added to the database
        from app.models.models import DiscoveredSoftware
        from sqlalchemy import select
        
        soft_query = select(DiscoveredSoftware).where(DiscoveredSoftware.asset_id == asset.id)
        result = await db.execute(soft_query)
        soft_items = result.scalars().all()
        
        print(f"[+] Found {len(soft_items)} software items in database for asset {asset.name}")
        for item in soft_items:
            print(f"    - {item.name} ({item.version}) by {item.vendor}")
            
        assert len(soft_items) == 3
        print("[SUCCESS] Software Discovery Verification Passed.")

if __name__ == "__main__":
    asyncio.run(verify_software_discovery())
