
import asyncio
import sys
import os

# Add the project root to sys.path
sys.path.append(os.getcwd())

from backend.app.services.snmp_service import scan_network_range

async def test_crash():
    print("[*] Testing scan_network_range with community=None (V3 mode)...")
    v3_data = {
        "username": "snmpuser",
        "authKey": "Admin@1234",
        "authProtocol": "SHA256",
        "privKey": "Admin@1234",
        "privProtocol": "AES256"
    }
    
    try:
        # This should fail with AttributeError in snmp_service.py:801
        await scan_network_range(
            cidr="127.0.0.1/32",
            community=None,
            v3_data=v3_data,
            context_name=""
        )
        print("[OK] No crash (unexpected).")
    except Exception as e:
        print(f"[!] Caught expected crash: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_crash())
