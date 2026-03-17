import asyncio
import sys
import os
import argparse
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app.services.snmp_service import scan_network_range
    from app.database.database import AsyncSessionLocal
    from app.models.models import Asset
    from app.services.discovery_service import process_discovery_payload
    from app.schemas.discovery_schema import DiscoveryPayload, DiscoveryHardware, DiscoveryOS
except ImportError:
    # Try alternate paths for standalone execution
    sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
    from app.services.snmp_service import scan_network_range
    from app.database.database import AsyncSessionLocal
    from app.models.models import Asset, AgentConfiguration
    from app.services.discovery_service import process_discovery_payload
    from app.schemas.discovery_schema import DiscoveryPayload, DiscoveryHardware, DiscoveryOS
    from app.services.encryption_service import decrypt_value
    from sqlalchemy import select

async def run_scanner(cidr: str = None, community: str = None):
    v3_data = None
    default_location_id = None
    
    # If parameters not provided, fetch from DB
    if not cidr or not community:
        print("[*] Fetching configuration from database...")
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(AgentConfiguration).where(AgentConfiguration.agent_id == 'agent-snmp')
            )
            config_rows = result.scalars().all()
            config = {row.config_key: row for row in config_rows}
            
            if not cidr and 'networkRange' in config:
                cidr = config['networkRange'].config_value

            if 'default_location_id' in config:
                default_location_id = config['default_location_id'].config_value

            if 'contextName' in config:
                context_name = config['contextName'].config_value
            else:
                context_name = ""
                
            # Check version
            version = config.get('snmpVersion').config_value if 'snmpVersion' in config else 'v2c'
            
            if version == 'v3':
                print("[*] Detected SNMP v3 configuration.")
                v3_data = {}
                keys = ['username', 'authKey', 'authProtocol', 'privKey', 'privProtocol']
                for k in keys:
                    if k in config:
                        row = config[k]
                        if row.is_sensitive:
                            v3_data[k] = decrypt_value(row.config_value)
                        else:
                            v3_data[k] = row.config_value
            else:
                if not community and 'communityString' in config:
                    row = config['communityString']
                    if row.is_sensitive:
                        try:
                            community = decrypt_value(row.config_value)
                        except Exception as e:
                            print(f"[!] Error decrypting community string: {e}")
                    else:
                        community = row.config_value
    
    # Fallbacks
    cidr = cidr or "192.168.1.0/24"
    context_name = context_name if 'context_name' in locals() else ""
    
    if not v3_data:
        community = community or "public"
        print(f"[*] Starting SNMP v2c Scan on {cidr} (Community: {community})...")
    else:
        print(f"[*] Starting SNMP v3 Scan on {cidr} (User: {v3_data.get('username')})...")

    devices = await scan_network_range(cidr, community or "public", v3_data, context_name)
    
    if not devices:
        print("[!] No SNMP-responsive devices found.")
        return

    print(f"[+] Found {len(devices)} devices. Syncing with database...")
    
    async with AsyncSessionLocal() as db:
        for dev in devices:
            # Construct a discovery payload similar to the agent's push
            # but adapted for agentless SNMP
            payload = DiscoveryPayload(
                agent_id="00000000-0000-0000-0000-000000000000", # Fixed UUID for Agentless
                location_id=default_location_id,
                hostname=dev["name"],
                ip_address=dev["ip_address"],
                hardware=DiscoveryHardware(
                    cpu=dev.get("cpu", "Network CPU"),
                    ram_mb=dev.get("ram_mb", 0),
                    serial=dev["serial_number"],
                    model=dev["model"],
                    vendor=dev["vendor"],
                    type=dev["type"],
                    storage_gb=dev.get("storage_gb", 0)
                ),
                os=DiscoveryOS(
                    name="Embedded/Firmware",
                    version="Unknown",
                    uptime_sec=0
                ),
                neighbors=dev.get("neighbors", []),
                metadata={
                    "method": "SNMP Sweep",
                    "snmp_description": dev.get("description"), # Pass cleaned description
                    "snmp_location": dev.get("location"),
                    "snmp_uptime": dev.get("uptime")
                }
            )
            
            # Use the existing discovery service to upsert
            # Standard enrichment logic will handle the specs
            asset = await process_discovery_payload(db, payload)
            print(f"[OK] Discovered {dev['vendor']} {dev['model']} ({dev['ip_address']})")

if __name__ == "__main__":
    import logging
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    
    parser = argparse.ArgumentParser(description="Agentless SNMP Asset Scanner")
    parser.add_argument("--range", default=None, help="CIDR range to scan")
    parser.add_argument("--community", default=None, help="SNMP community string")
    
    args = parser.parse_args()
    
    try:
        asyncio.run(run_scanner(args.range, args.community))
    except KeyboardInterrupt:
        print("\n[!] Scan cancelled by user.")
    except Exception as e:
        print(f"\n[ERROR] Scan failed: {e}")
