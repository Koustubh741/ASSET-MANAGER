import asyncio
import os
import sys
import json

# Add parent directory to path to reach app module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services import snmp_service

async def manual_scan():
    # User provided credentials
    credentials = {
        "communityString": "public",
        "contextName": "vlan100",
        "username": "snmpuser",
        "snmpVersion": "v3",
        "authProtocol": "SHA",
        "exclusions": "",
        "authKey": "password123",
        "privKey": "password123",
        "networkRange": "172.16.0.10/24",
        "privProtocol": "AES128"
    }

    print(f"[*] Starting Manual SNMP v3 Scan...")
    print(f"[*] Target Range: {credentials['networkRange']}")
    print(f"[*] Context Name: {credentials['contextName']}")
    print(f"[*] User: {credentials['username']}")

    v3_data = {
        'username': credentials['username'],
        'authKey': credentials['authKey'],
        'authProtocol': credentials['authProtocol'],
        'privKey': credentials['privKey'],
        'privProtocol': credentials['privProtocol']
    }

    cidr = credentials['networkRange']
    community = credentials['communityString']
    context = credentials['contextName']

    try:
        devices = await snmp_service.scan_network_range(
            cidr=cidr, 
            community=community, 
            v3_data=v3_data, 
            context_name=context
        )
        
        print(f"\n[+] Scan Finished! Found {len(devices)} devices.")
        
        for idx, dev in enumerate(devices):
            print(f"\nDevice {idx + 1}:")
            print(f"  - IP: {dev['ip_address']}")
            print(f"  - Name: {dev['name']}")
            print(f"  - Vendor: {dev['vendor']}")
            print(f"  - Type: {dev['type']}")
            print(f"  - Serial: {dev['serial_number']}")
            
    except Exception as e:
        print(f"\n[!] Error during manual scan: {str(e)}")

if __name__ == "__main__":
    asyncio.run(manual_scan())
