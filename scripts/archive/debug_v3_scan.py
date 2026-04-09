
import asyncio
import sys
import os
import logging

# Add the project root to sys.path
sys.path.append(os.getcwd())

from backend.app.services.snmp_service import scan_network_range

async def main():
    # Credentials from USER_REQUEST
    network_range = "172.16.110.1/24"
    v3_data = {
        "username": "snmpuser",
        "authKey": "Admin@1234",
        "authProtocol": "SHA256",
        "privKey": "Admin@1234",
        "privProtocol": "AES256"
    }
    
    print(f"[*] Starting manual SNMP V3 scan on {network_range}...")
    print(f"[*] Credentials: {v3_data}")
    
    # Configure logging to see what's happening
    logging.basicConfig(level=logging.DEBUG, format="%(asctime)s [%(levelname)s] %(message)s")
    
    try:
        devices = await scan_network_range(
            cidr=network_range,
            community="public", # Not used for V3
            v3_data=v3_data,
            context_name=""
        )
        
        if not devices:
            print("[!] No devices found or authentication failed.")
        else:
            print(f"[+] Successfully found {len(devices)} devices:")
            for dev in devices:
                print(f" - {dev.get('ip_address')} ({dev.get('vendor')} {dev.get('type')})")
                
    except Exception as e:
        print(f"[ERROR] Scan failed with exception: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
