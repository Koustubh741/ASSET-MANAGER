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

async def probe_v3_handshake(target_ip):
    print(f"[*] SNMP v3 PROBER: Testing '{target_ip}'...")
    
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(AgentConfiguration).where(AgentConfiguration.agent_id == 'agent-snmp')
        )
        configs = {row.config_key: row for row in result.scalars().all()}
        
        if not configs:
            print("[!] No configuration found in DB.")
            return

        user = configs.get('username').config_value
        auth_key = decrypt_value(configs['authKey'].config_value)
        priv_key = decrypt_value(configs['privKey'].config_value)
        
        # Combinations to try
        auth_protos = ['SHA', 'SHA256', 'MD5']
        priv_protos = ['AES256', 'AES', 'DES']
        contexts = ['', 'default', 'vlan-1', 'vlan100', 'vlan-all']
        
        print(f"[*] Starting Protocol + Context Brute-Force for user: {user}")
        
        for ctx in contexts:
            for auth in auth_protos:
                for priv in priv_protos:
                    display_ctx = f"'{ctx}'" if ctx else "empty"
                    print(f"    - Trying Context:{display_ctx} | Auth:{auth} | Priv:{priv}...", end='\r')
                    
                    v3_data = {
                        'username': user,
                        'authKey': auth_key,
                        'authProtocol': auth,
                        'privKey': priv_key,
                        'privProtocol': priv
                    }
                    
                    scanner = SNMPScanner(v3_data=v3_data, context_name=ctx)
                try:
                    info = await asyncio.wait_for(scanner.get_device_info(target_ip), timeout=3.0)
                    if info:
                        print(f"\n[MATCH FOUND!]")
                        print(f"    >>> Context: {'(empty)' if not ctx else ctx}")
                        print(f"    >>> AuthProtocol: {auth}")
                        print(f"    >>> PrivProtocol: {priv}")
                        print(f"    >>> Device: {info['vendor']} {info['type']} ({info['name']})")
                        return
                except:
                    continue
        
        print("\n[FAILURE] No protocol combination worked. This device might:")
        print("    1. Require a Context Name (e.g. 'vlan-1')")
        print("    2. Require a specific EngineID")
        print("    3. Be blocking this server's IP in its SNMP ACL")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python v3_handshake_prober.py <target_ip>")
    else:
        asyncio.run(probe_v3_handshake(sys.argv[1]))
