import asyncio
import os
import sys
from sqlalchemy import select

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import AsyncSessionLocal
from app.models.models import AgentConfiguration
from app.services.snmp_service import SNMPScanner
from app.services.encryption_service import decrypt_value

async def test_single_device(target_ip):
    print(f"[*] Testing SNMP Connectivity for: {target_ip}")
    
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(AgentConfiguration).where(AgentConfiguration.agent_id == 'agent-snmp')
        )
        configs = {row.config_key: row for row in result.scalars().all()}
        
        if not configs:
            print("[!] No configuration found!")
            return

        version = configs.get('snmpVersion').config_value if 'snmpVersion' in configs else 'v2c'
        context_name = configs.get('contextName').config_value if 'contextName' in configs else ""
        v3_data = None
        community = "public"

        if version == 'v3':
            v3_data = {}
            for k in ['username', 'authKey', 'authProtocol', 'privKey', 'privProtocol']:
                if k in configs:
                    row = configs[k]
                    v3_data[k] = decrypt_value(row.config_value) if row.is_sensitive else row.config_value
            print(f"[*] Using SNMP v3 (User: {v3_data.get('username')})")
        else:
            if 'communityString' in configs:
                row = configs['communityString']
                community = decrypt_value(row.config_value) if row.is_sensitive else row.config_value
            print(f"[*] Using SNMP v2c (Community: {community})")

        scanner = SNMPScanner(communities=[community], v3_data=v3_data, context_name=context_name)
        
        print(f"[*] Sending sysDescr probe (Timeout: 5s)...")
        info = await scanner.get_device_info(target_ip)
        
        if info:
            print(f"[SUCCESS] Device Responded!")
            print(f"    - Name: {info['name']}")
            print(f"    - Vendor: {info['vendor']}")
            print(f"    - Type: {info['type']}")
            print(f"    - Serial: {info['serial_number']}")
        else:
            print("[FAILURE] No response from device. This could be due to:")
            print("    1. Incorrect Credentials (v3 Keys / Community)")
            print("    2. Firewall blocking UDP 161")
            print("    3. Device IP not in allow-list for the Manager")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python debug_single_snmp.py <target_ip>")
    else:
        asyncio.run(test_single_device(sys.argv[1]))
