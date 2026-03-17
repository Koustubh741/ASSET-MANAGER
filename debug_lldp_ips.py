
import asyncio
import os
import sys

# Add parent directory to path
sys.path.append(os.getcwd())

from pysnmp.hlapi.asyncio import (
    SnmpEngine, ContextData, ObjectIdentity, ObjectType,
    UsmUserData, UdpTransportTarget, next_cmd,
    usmHMAC192SHA256AuthProtocol, usmAesCfb256Protocol
)

async def debug_lldp_correlation():
    print("[*] Debugging LLDP Correlation for 172.16.110.1...")
    
    engine = SnmpEngine()
    security = UsmUserData(
        "snmpuser",
        authKey="Admin@1234",
        privKey="Admin@1234",
        authProtocol=usmHMAC192SHA256AuthProtocol,
        privProtocol=usmAesCfb256Protocol
    )
    
    transport = await UdpTransportTarget.create(("172.16.110.1", 161), timeout=2.0)
    
    # Prefix for lldpRemSysName
    NAME_PREFIX = "1.0.8802.1.1.2.1.4.1.1.9"
    # Prefix for lldpRemManAddrIfSubtype (to get IPs)
    IP_PREFIX = "1.0.8802.1.1.2.1.4.2.1.2"
    
    async def walk(prefix):
        results = {}
        current_oid = ObjectType(ObjectIdentity(prefix))
        while True:
            try:
                err_ind, err_status, _, var_binds = await next_cmd(
                    engine, security, transport, ContextData(),
                    current_oid, lexicographicMode=False
                )
            except Exception as e:
                break
            if err_ind or err_status or not var_binds:
                break
            
            var_bind = var_binds[0]
            oid_str = str(var_bind[0])
            if not oid_str.startswith(prefix):
                break
                
            val = var_bind[1].prettyPrint()
            # The index is the part after the prefix
            index = oid_str[len(prefix)+1:]
            results[index] = val
            current_oid = ObjectType(ObjectIdentity(var_bind[0]))
        return results

    print("[*] Walking Names...")
    names = await walk(NAME_PREFIX)
    print(f"    Found {len(names)} names.")
    
    print("[*] Walking IPs...")
    ips_raw = await walk(IP_PREFIX)
    print(f"    Found {len(ips_raw)} IP entries.")
    
    print("\n--- Correlation ---")
    for idx, name in names.items():
        print(f"Neighbor: {name} (Index: {idx})")
        # For IPs, the index in lldpRemManAddrTable starts with the same index as lldpRemTable
        # but has subtype/length/ip appended. We search for keys that START with our index.
        matches = [val for sub_idx, val in ips_raw.items() if sub_idx.startswith(idx)]
        if matches:
            # The value of lldpRemManAddrIfSubtype isn't the IP itself, 
            # the IP is usually the LAST 4 decimals of the OID if subtype is 1.
            # But the value pretty-printed might be hex of the IP.
            # Let's see what we got.
            for m in matches:
                print(f"    -> IP Entry Value: {m}")
        else:
            print("    -> No IP found in LLDP table.")

if __name__ == "__main__":
    asyncio.run(debug_lldp_correlation())
