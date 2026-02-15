import asyncio
import uuid
from app.database.database import AsyncSessionLocal
from app.models.models import DiscoveryScan, DiscoveryDiff, Asset
from app.schemas.discovery_schema import DiscoveryPayload, DiscoveryHardware, DiscoveryOS
from app.services.discovery_service import process_discovery_payload
from datetime import datetime

async def test_diff_tracking():
    """Test the diff tracking system with a simulated asset update"""
    print("[*] Testing Diff Tracking System...")
    
    async with AsyncSessionLocal() as db:
        # 1. Create a scan session
        scan_id = uuid.uuid4()
        scan = DiscoveryScan(
            id=scan_id,
            agent_id="test-agent-001",
            scan_type="local",
            status="STARTED"
        )
        db.add(scan)
        await db.commit()
        print(f"[+] Created scan session: {scan_id}")
        
        # 2. Create initial asset
        payload1 = DiscoveryPayload(
            agent_id=uuid.uuid4(),
            scan_id=scan_id,
            hostname="test-workstation",
            ip_address="192.168.1.100",
            hardware=DiscoveryHardware(
                cpu="Intel Core i5",
                ram_mb=8192,
                serial="TEST-SERIAL-001",
                model="Dell OptiPlex 7090",
                vendor="Dell",
                type="Desktop",
                storage_gb=256
            ),
            os=DiscoveryOS(
                name="Windows",
                version="11 Pro",
                uptime_sec=3600
            ),
            software=[]
        )
        
        asset = await process_discovery_payload(db, payload1)
        print(f"[+] Created asset: {asset.name} (ID: {asset.id})")
        
        # 3. Update asset with changes (new scan)
        scan_id2 = uuid.uuid4()
        scan2 = DiscoveryScan(
            id=scan_id2,
            agent_id="test-agent-001",
            scan_type="local",
            status="STARTED"
        )
        db.add(scan2)
        await db.commit()
        
        payload2 = DiscoveryPayload(
            agent_id=uuid.uuid4(),
            scan_id=scan_id2,
            hostname="test-workstation",
            ip_address="192.168.1.100",
            hardware=DiscoveryHardware(
                cpu="Intel Core i5",
                ram_mb=16384,  # Changed from 8GB to 16GB
                serial="TEST-SERIAL-001",
                model="Dell OptiPlex 7090",
                vendor="Dell",
                type="Desktop",
                storage_gb=512  # Changed from 256GB to 512GB
            ),
            os=DiscoveryOS(
                name="Windows",
                version="11 Pro 22H2",  # Changed version
                uptime_sec=7200
            ),
            software=[]
        )
        
        await process_discovery_payload(db, payload2)
        print(f"[+] Updated asset with changes")
        
        # 4. Query diffs
        from sqlalchemy import select
        result = await db.execute(
            select(DiscoveryDiff)
            .where(DiscoveryDiff.scan_id == scan_id2)
            .order_by(DiscoveryDiff.detected_at)
        )
        diffs = result.scalars().all()
        
        print(f"\n[+] Detected {len(diffs)} configuration changes:")
        for diff in diffs:
            print(f"  - {diff.field_name}: '{diff.old_value}' → '{diff.new_value}'")
        
        # 5. Mark scan as complete
        scan2.status = "COMPLETED"
        scan2.end_time = datetime.now()
        scan2.assets_processed = 1
        await db.commit()
        
        print(f"\n[✓] Diff tracking test completed successfully!")
        print(f"[✓] Scan ID for verification: {scan_id2}")

if __name__ == "__main__":
    asyncio.run(test_diff_tracking())
