
import asyncio
import sys
import os

# Add the project root to sys.path
sys.path.append(os.getcwd())

from backend.app.services.snmp_service import SNMPScanner, ScanConfig, SNMPv3Credentials, AuthProtocol, PrivProtocol

async def verify_trial_sequence():
    print("[*] Verifying SNMP Trial Sequence (V3 -> V2c)...")
    
    # 1. Config with both V3 and V2c (public already handles 'public')
    v3_creds = SNMPv3Credentials(
        username="invalid_user",
        auth_key="invalid_key",
        auth_protocol=AuthProtocol.SHA,
        priv_key="invalid_key",
        priv_protocol=PrivProtocol.AES
    )
    
    config = ScanConfig(
        communities=["public", "private"],
        v3=v3_creds,
        timeout=1.0,
        retries=0
    )
    
    scanner = SNMPScanner(config)
    
    # Target an IP that doesn't exist to see the trial sequence in logs
    # We expect to see:
    # 1. SNMPv3 trial failed
    # 2. Probe community 'public'
    # 3. Probe community 'private'
    
    print("[*] Polling 127.0.0.1 (expecting handshake failures in logs)...")
    import logging
    logging.basicConfig(level=logging.DEBUG)
    
    # We don't care if it returns None, we care about the sequence
    await scanner.poll_device("127.0.0.1")
    
    print("\n[!] Check logs above for the sequence: V3 Trial -> Community Trials")

if __name__ == "__main__":
    asyncio.run(verify_trial_sequence())
