import asyncio
import sys
import os
import argparse
import json

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app.services.snmp_service import scan_network_range
    from app.database.database import SessionLocal
    from app.models.models import Asset
    from app.services.discovery_service import process_discovery_payload
    from app.schemas.discovery_schema import DiscoveryPayload, DiscoveryHardware, DiscoveryOS
except ImportError:
    # Try alternate paths for standalone execution
    sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
    from app.services.snmp_service import scan_network_range
    from app.database.database import SessionLocal
    from app.models.models import Asset
    from app.services.discovery_service import process_discovery_payload
    from app.schemas.discovery_schema import DiscoveryPayload, DiscoveryHardware, DiscoveryOS

async def run_scanner(cidr: str, community: str):
    print(f"[*] Starting SNMP Scan on {cidr} (Community: {community})...")
    devices = await scan_network_range(cidr, community)
    
    if not devices:
        print("[!] No SNMP-responsive devices found.")
        return

    print(f"[+] Found {len(devices)} devices. Syncing with database...")
    
    async with SessionLocal() as db:
        for dev in devices:
            # Construct a discovery payload similar to the agent's push
            # but adapted for agentless SNMP
            payload = DiscoveryPayload(
                agent_id="00000000-0000-0000-0000-000000000000", # Fixed UUID for Agentless
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
                ),
                metadata={"method": "SNMP Sweep"}
            )
            
            # Use the existing discovery service to upsert
            # Since snmp_service returned a partial dict, we manually apply specs
            asset = await process_discovery_payload(db, payload)
            
            # Override specifications with our detailed SNMP info
            asset.specifications = dev["specifications"]
            await db.commit()
            print(f"[OK] Discovered {dev['vendor']} {dev['type']} ({dev['ip_address']})")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Agentless SNMP Asset Scanner")
    parser.add_argument("--range", default="192.168.1.0/24", help="CIDR range to scan")
    parser.add_argument("--community", default="public", help="SNMP community string")
    
    args = parser.parse_args()
    
    try:
        asyncio.run(run_scanner(args.range, args.community))
    except KeyboardInterrupt:
        print("\n[!] Scan cancelled by user.")
    except Exception as e:
        print(f"\n[ERROR] Scan failed: {e}")
