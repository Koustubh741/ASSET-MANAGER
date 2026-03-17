import asyncio
import os
import sys
from dotenv import load_dotenv

load_dotenv()

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database.database import AsyncSessionLocal
from app.models.models import AgentConfiguration
from app.services.snmp_service import SNMPScanner, ScanConfig, SNMPv3Credentials, AuthProtocol, PrivProtocol
from app.services.encryption_service import decrypt_value
from sqlalchemy import select

PROBE_IPS = ["172.16.110.1", "172.16.110.3"]

async def probe():
    print("[*] Loading SNMPv3 credentials from DB...")
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(AgentConfiguration).where(AgentConfiguration.agent_id == 'agent-snmp'))
        config = {row.config_key: row for row in result.scalars().all()}
        
        username = config['username'].config_value
        auth_key = decrypt_value(config['authKey'].config_value)
        priv_key = decrypt_value(config['privKey'].config_value)
        auth_proto = config['authProtocol'].config_value
        priv_proto = config['privProtocol'].config_value
        ctx_name = config.get('contextName').config_value if 'contextName' in config else ""

        print(f"[*] Credentials: user={username}, auth={auth_proto}, priv={priv_proto}, ctx='{ctx_name}'")

        # Try v3 with configured creds
        for ip in PROBE_IPS:
            print(f"\n[*] Probing {ip} with SNMPv3...")
            v3_creds = SNMPv3Credentials(
                username=username,
                auth_key=auth_key,
                priv_key=priv_key,
                auth_protocol=AuthProtocol(auth_proto),
                priv_protocol=PrivProtocol(priv_proto)
            )
            config_obj = ScanConfig(v3=v3_creds, context_name=ctx_name)
            scanner = SNMPScanner(config_obj)
            device = await scanner.poll_device(ip)
            
            if device:
                print(f"  [SUCCESS] {device.vendor} {device.device_type} ({device.name})")
                print(f"  Serial: {device.serial_number}")
                print(f"  Neighbors: {len(device.neighbors)}")
                for n in device.neighbors:
                    print(f"    - {n.neighbor_name} (Port: {n.neighbor_port})")
            else:
                # Fall back to v2c
                print(f"  [v3 failed] Trying v2c with community='public'...")
                config_v2 = ScanConfig(communities=["public"], context_name="")
                scanner_v2 = SNMPScanner(config_v2)
                device_v2 = await scanner_v2.poll_device(ip)
                if device_v2:
                    print(f"  [SUCCESS via v2c] {device_v2.vendor} {device_v2.device_type} ({device_v2.name})")
                else:
                    print(f"  [FAILURE] {ip} did not respond to v3 or v2c SNMP.")

if __name__ == "__main__":
    import logging
    logging.basicConfig(level=logging.WARNING, format="%(asctime)s [%(levelname)s] %(message)s")
    asyncio.run(probe())
