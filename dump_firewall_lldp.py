
import asyncio
import os
import sys

# Add parent directory to path
sys.path.append(os.getcwd())

from backend.app.services.snmp_service import scan_network_range

async def dump_lldp():
    print("[*] Dumping LLDP Table for 172.16.110.1...")
    
    # We'll use a modified version of the prober or just raw pysnmp
    from pysnmp.hlapi.asyncio import (
        SnmpEngine, ContextData, ObjectIdentity, ObjectType,
        UsmUserData, UdpTransportTarget, next_cmd,
        usmHMAC192SHA256AuthProtocol, usmAesCfb256Protocol
    )

    engine = SnmpEngine()
    # Hardcoded working creds
    user = "snmpuser"
    auth_key = "Admin@1234"
    priv_key = "Admin@1234"
    
    security = UsmUserData(
        user,
        authKey=auth_key,
        privKey=priv_key,
        authProtocol=usmHMAC192SHA256AuthProtocol,
        privProtocol=usmAesCfb256Protocol
    )
    
    transport = await UdpTransportTarget.create(("172.16.110.1", 161), timeout=2.0)
    
    # LLDP Remote Table Prefix
    lldp_remote_prefix = "1.0.8802.1.1.2.1.4"
    
    print(f"[*] Walking {lldp_remote_prefix}...")
    
    current_oid = ObjectType(ObjectIdentity(lldp_remote_prefix))
    found_any = False
    
    while True:
        try:
            err_ind, err_status, _, var_binds = await next_cmd(
                engine, security, transport, ContextData(),
                current_oid, lexicographicMode=False
            )
        except Exception as e:
            print(f"[!] Error: {e}")
            break
            
        if err_ind or err_status or not var_binds:
            break
            
        exit_walk = False
        for var_bind in var_binds:
            oid_str = str(var_bind[0])
            if not oid_str.startswith(lldp_remote_prefix):
                exit_walk = True
                break
            
            print(f"    {oid_str} = {var_bind[1].prettyPrint()}")
            current_oid = ObjectType(ObjectIdentity(var_bind[0]))
            found_any = True
            
        if exit_walk:
            break

    if not found_any:
        print("[!] No LLDP remote data found.")

if __name__ == "__main__":
    asyncio.run(dump_lldp())
