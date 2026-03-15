import asyncio
import os
import sys
import json
from uuid import uuid4

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from app.database.database import AsyncSessionLocal
from app.models.models import Asset
from app.services.discovery_service import process_discovery_payload
from app.schemas.discovery_schema import DiscoveryPayload, DiscoveryHardware, DiscoveryOS

async def simulate_root_fix_verification():
    async with AsyncSessionLocal() as db:
        # Target the NSW_GFloor asset
        hostname = "NSW_GFloor.cachedigitech.local"
        ip = "172.16.0.9"
        serial = "FJC253311TP"
        
        # This is the hex description currently in the DB
        hex_desc = "0x436973636f20494f5320536f667477617265205b437570657274696e6f5d2c20436174616c797374204c332053776974636820536f6674776172652028434154394b5f494f535845292c2056657273696f6e2031372e392e352c2052454c4541534520534f4654574152452028666331290d0a546563686e6963616c20537570706f72743a20687474703a2f2f7777772e636973636f2e636f6d2f74656368737570706f72740d0a436f707972696768742028632920313938362d3230323420627920436973636f2053797374656d732c20496e632e0d0a436f6d70696c6564205475652033302d4a616e2d32342031353a3438206279206d63707265"
        
        # 1. Construct Payload with RAW hex description and generic metadata
        # We are intentionally leaving vendor/model/type as generic to test enrichment
        payload = DiscoveryPayload(
            agent_id="00000000-0000-0000-0000-000000000000",
            location_id=None,
            hostname=hostname,
            ip_address=ip,
            hardware=DiscoveryHardware(
                cpu="Embedded Processor",
                ram_mb=0,
                serial=serial,
                model="Network Node", 
                vendor="Unknown",     
                type="Unknown"        
            ),
            os=DiscoveryOS(
                name="Cisco IOS XE",
                version="17.9.5",
                uptime_sec=17927110
            ),
            metadata={
                "method": "ROOT_FIX_SIMULATION",
                "snmp_description": hex_desc, # PASS RAW HEX
                "snmp_location": "Ground Floor",
                "snmp_uptime": "17927110"
            }
        )

        # 2. Process
        print("Processing discovery payload through Root Fix pipeline...")
        asset = await process_discovery_payload(db, payload)
        
        print("\n--- Root Fix Verification Result ---")
        print(f"Asset:  {asset.name}")
        print(f"Vendor: {asset.vendor} (Expected: Cisco)")
        print(f"Type:   {asset.type} (Expected: Switch)")
        print(f"Model:  {asset.model} (Expected: CAT9K_IOSXE or similar)")
        print(f"Specs:  {json.dumps(asset.specifications, indent=2)}")

if __name__ == "__main__":
    asyncio.run(simulate_root_fix_verification())
