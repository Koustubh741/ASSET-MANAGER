import asyncio
import os
import sys

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services import snmp_service

async def test_no_context():
    """Test SNMP with correct credentials but NO context name"""
    
    print("[*] Testing SNMP v3 WITHOUT Context Name")
    print("[*] Target: 172.16.0.1 and 172.16.0.10")
    print("[*] User: snmpuser")
    print("[*] Auth: SHA / password123")
    print("[*] Priv: AES128 / password123")
    print("[*] Context: EMPTY (no context)")
    print()

    v3_data = {
        'username': 'snmpuser',
        'authKey': 'password123',
        'authProtocol': 'SHA',
        'privKey': 'password123',
        'privProtocol': 'AES128'
    }

    # Test just two specific IPs
    test_ips = ["172.16.0.1", "172.16.0.10"]
    
    for ip in test_ips:
        print(f"\n[*] Testing {ip}...")
        devices = await snmp_service.scan_network_range(
            cidr=f"{ip}/32",  # Single IP
            community="public", 
            v3_data=v3_data, 
            context_name=""  # NO CONTEXT
        )
        
        if devices:
            print(f"✅ SUCCESS! Found device at {ip}:")
            for dev in devices:
                print(f"  - Name: {dev['name']}")
                print(f"  - Vendor: {dev['vendor']}")
                print(f"  - Type: {dev['type']}")
        else:
            print(f"❌ No response from {ip}")

if __name__ == "__main__":
    asyncio.run(test_no_context())
