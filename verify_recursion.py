
import asyncio
import os
import sys

# Add parent directory to path
sys.path.append(os.getcwd())

from backend.app.services.snmp_service import scan_network, ScanConfig, SNMPv3Credentials, AuthProtocol, PrivProtocol

async def verify_recursive_flow():
    print("[*] Verifying Recursive Neighbor Discovery...")
    
    # 1. Config for Firewall
    v3_creds = SNMPv3Credentials(
        username="snmpuser",
        auth_key="Admin@1234",
        priv_key="Admin@1234",
        auth_protocol=AuthProtocol.SHA256,
        priv_protocol=PrivProtocol.AES256
    )
    
    config = ScanConfig(
        v3=v3_creds,
        timeout=2.0,
        retries=1,
        max_hosts=10,
        communities=["public"] # NSW_2ndFloor likely uses public
    )
    
    # We scan ONLY the firewall IP, but we expect it to recursively find the neighbor
    target_ip = "172.16.110.1"
    cidr = f"{target_ip}/32"
    
    print(f"[*] Starting scan on {cidr} (expects recursive discovery of neighbors)...")
    result = await scan_network(cidr, config)
    
    print(f"[+] Scan complete. Found {len(result.devices)} devices.")
    for dev in result.devices:
        print(f"    - IP: {dev.ip_address}")
        print(f"      Name:  {dev.name}")
        print(f"      Model: {dev.model}")
        print(f"      SNMP:  {dev.snmp_version}")
        
    # Check if we found the neighbor (172.16.0.10)
    neighbor_ip = "172.16.0.10"
    found_neighbor = any(d.ip_address == neighbor_ip for d in result.devices)
    
    if found_neighbor:
        print(f"\n[SUCCESS] Recursive discovery found neighbor {neighbor_ip}!")
        neighbor = next(d for d in result.devices if d.ip_address == neighbor_ip)
        if neighbor.model != "Neighbor Node":
            print(f"[SUCCESS] Neighbor was PROMOTED from Stub to full asset (Model: {neighbor.model})")
        else:
            print("[WARNING] Neighbor was found but still has 'Neighbor Node' model. Check V2c credentials.")
    else:
        print(f"\n[FAILURE] Recursive discovery did NOT find neighbor {neighbor_ip}.")

if __name__ == "__main__":
    asyncio.run(verify_recursive_flow())
