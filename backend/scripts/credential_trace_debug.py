import asyncio
import os
import sys
from sqlalchemy import select

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import AsyncSessionLocal
from app.models.models import AgentConfiguration
from app.services.encryption_service import decrypt_value

async def trace_credentials():
    print("[*] Starting SNMP Credential Trace...")
    
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(AgentConfiguration).where(AgentConfiguration.agent_id == 'agent-snmp')
        )
        configs = {row.config_key: row for row in result.scalars().all()}
        
        if not configs:
            print("[!] CRITICAL: No configuration entries found for 'agent-snmp' in database.")
            return

        print(f"[+] Found {len(configs)} configuration keys.")

        # Test Decryption
        sensitive_keys = ['communityString', 'authKey', 'privKey']
        all_decrypted = True
        
        for key in sensitive_keys:
            if key in configs:
                row = configs[key]
                print(f"[*] Testing decryption for: {key} (Encrypted: {row.is_sensitive})")
                try:
                    if row.is_sensitive:
                        decrypted = decrypt_value(row.config_value)
                        if decrypted:
                            print(f"    [OK] Decryption successful. (Length: {len(decrypted)})")
                        else:
                            print(f"    [FAIL] Decryption returned empty string.")
                            all_decrypted = False
                    else:
                        print(f"    [NOTE] Key is not marked as sensitive. Value: {configs[key].config_value}")
                except Exception as e:
                    print(f"    [ERROR] Decryption failed for {key}: {str(e)}")
                    all_decrypted = False

        # Verify Protocol Mappings
        version = configs.get('snmpVersion').config_value if 'snmpVersion' in configs else 'v2c'
        print(f"[*] SNMP Version detected: {version}")

        if version == 'v3':
            auth_proto = configs.get('authProtocol').config_value if 'authProtocol' in configs else 'NONE'
            priv_proto = configs.get('privProtocol').config_value if 'privProtocol' in configs else 'NONE'
            
            # Simple check for the mapping logic used in snmp_service.py
            valid_auth = ['MD5', 'SHA', 'SHA256']
            valid_priv = ['DES', '3DES', 'AES', 'AES192', 'AES256']
            
            if auth_proto.upper() in valid_auth:
                print(f"    [OK] Auth Protocol '{auth_proto}' is valid and mapped.")
            else:
                print(f"    [WARNING] Auth Protocol '{auth_proto}' might not be correctly mapped.")

            if priv_proto.upper() in valid_priv:
                print(f"    [OK] Priv Protocol '{priv_proto}' is valid and mapped.")
            else:
                print(f"    [WARNING] Priv Protocol '{priv_proto}' might not be correctly mapped.")

        if all_decrypted:
            print("\n[CONCLUSION] Credential integrity verified at REST and during DECRYPTION.")
        else:
            print("\n[CONCLUSION] Credential integrity failed. Check encryption secrets.")

if __name__ == "__main__":
    asyncio.run(trace_credentials())
