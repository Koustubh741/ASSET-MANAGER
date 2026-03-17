
import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone

# Add parent directory to path
sys.path.append(os.getcwd())

from backend.app.services.snmp_service import SNMPScanner, ScanConfig, SNMPv3Credentials, AuthProtocol, PrivProtocol
from backend.app.services.discovery_service import process_discovery_payload
from backend.app.database.database import AsyncSessionLocal
from backend.app.models.models import Asset

async def verify_deep_discovery():
    print("[*] Verifying Deep Neighbor Discovery Flow...")
    
    # 1. Config for Firewall
    v3_creds = SNMPv3Credentials(
        username="snmpuser",
        auth_key="Admin@1234",
        priv_key="Admin@1234",
        auth_protocol=AuthProtocol.SHA256,
        priv_protocol=PrivProtocol.AES256
    )
    
    config = ScanConfig(
        v3=v3_creds,
        timeout=2.0,
        retries=1
    )
    
    scanner = SNMPScanner(config)
    ip = "172.16.110.1"
    
    print(f"[*] Polling {ip} for neighbors...")
    device_info = await scanner.poll_device(ip)
    
    if not device_info:
        print("[!] Failed to poll firewall.")
        return
        
    print(f"[+] Found {len(device_info.neighbors)} neighbors.")
    for n in device_info.neighbors:
        print(f"    - {n.neighbor_name} (IP: {n.neighbor_ip})")
        
    # 2. Process Payload to DB
    async with AsyncSessionLocal() as db:
        print("[*] Processing payload to Database...")
        from backend.app.schemas.discovery_schema import DiscoveryPayload, DiscoveryHardware, DiscoveryOS
        
        # Mock payload
        payload = DiscoveryPayload(
            agent_id=uuid.uuid4(),
            hostname=device_info.name,
            ip_address=device_info.ip_address,
            hardware=DiscoveryHardware(
                cpu=device_info.cpu,
                ram_mb=device_info.ram_mb,
                serial=device_info.serial_number or "UNKNOWN",
                model=device_info.model,
                vendor=device_info.vendor,
                type="Networking"
            ),
            os=DiscoveryOS(
                name="FortiOS",
                version="v7.x",
                uptime_sec=0
            ),
            neighbors=[n.to_dict() for n in device_info.neighbors]
        )
        
        await process_discovery_payload(db, payload)
        await db.commit()
        
    # 3. Verify DB Result
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        for n in device_info.neighbors:
            result = await db.execute(
                select(Asset).where(Asset.name == n.neighbor_name)
            )
            asset = result.scalars().first()
            if asset:
                print(f"[+] Verified DB Asset: {asset.name}")
                print(f"    Specifications: {asset.specifications}")
                if asset.specifications.get("IP Address") == n.neighbor_ip:
                    print(f"    [MATCH] IP Address {n.neighbor_ip} recorded correctly.")
                else:
                    print(f"    [MISMATCH] IP Address expected {n.neighbor_ip}, got {asset.specifications.get('IP Address')}")
            else:
                print(f"[!] Asset {n.neighbor_name} not found in DB.")

if __name__ == "__main__":
    asyncio.run(verify_deep_discovery())
