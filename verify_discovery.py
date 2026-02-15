
import asyncio
import uuid
import sys
import os
from datetime import datetime

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database.database import AsyncSessionLocal
from app.services.discovery_service import process_discovery_payload
from app.schemas.discovery_schema import DiscoveryPayload, DiscoveryHardware, DiscoveryOS
from app.models.models import Asset, User

async def verify_discovery_assignment():
    print("[*] Starting discovery assignment verification...")
    
    # 1. Ensure we have a test user to map to
    async with AsyncSessionLocal() as db:
        # Check for a user
        from sqlalchemy import select
        user_res = await db.execute(select(User).limit(1))
        test_user = user_res.scalars().first()
        
        if not test_user:
            print("[!] No user found for mapping. Creating test user...")
            test_user = User(
                id=uuid.uuid4(),
                email="discovery.test@example.com",
                full_name="Discovery Tester",
                role="USER",
                status="ACTIVE"
            )
            db.add(test_user)
            await db.commit()
            print(f"[+] Created test user: {test_user.email}")
        else:
            print(f"[*] Using existing test user: {test_user.email}")

        # 2. Define location ID (using the Cloud ID we just seeded)
        location_id = uuid.UUID("c51ec6e6-de9f-48fa-b397-c861b33f3fb4")

        # 3. Simulate a payload with 'primary_user' matching our test user
        username_part = test_user.email.split('@')[0]
        payload = DiscoveryPayload(
            agent_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
            location_id=location_id,
            hostname=f"verify-host-{uuid.uuid4().hex[:4]}",
            ip_address="127.0.0.1",
            hardware=DiscoveryHardware(
                cpu="Test CPU",
                ram_mb=4096,
                serial=f"VERIFY-{uuid.uuid4().hex[:8].upper()}",
                model="Verification VM",
                vendor="ITSM Test",
                type="Workstation",
                primary_user=username_part # This should trigger the mapping
            ),
            os=DiscoveryOS(
                name="Test OS",
                version="1.0",
                uptime_sec=100
            ),
            software=[]
        )

        print(f"[*] Processing payload for {payload.hostname}...")
        asset = await process_discovery_payload(db, payload)
        
        print(f"[+] Asset Created/Updated: {asset.name}")
        print(f"    - Serial: {asset.serial_number}")
        print(f"    - Location ID: {asset.location_id}")
        print(f"    - Assigned To ID: {asset.assigned_to_id}")

        # Final check
        success = True
        if asset.location_id != location_id:
            print("[!] FAIL: Location ID mismatch!")
            success = False
        if asset.assigned_to_id != test_user.id:
            print("[!] FAIL: Assigned To ID mismatch!")
            success = False
        
        if success:
            print("[SUCCESS] All discovery fields persisted correctly.")
        else:
            print("[FAILURE] Some discovery fields are still missing.")

if __name__ == "__main__":
    asyncio.run(verify_discovery_assignment())
