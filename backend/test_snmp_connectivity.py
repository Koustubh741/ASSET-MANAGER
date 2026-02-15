import asyncio
import sys
import logging
from pysnmp.hlapi.asyncio import *

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("snmp_test")

async def test_v2c(ip, community="public"):
    print(f"[*] Testing SNMPv2c on {ip} with community '{community}'...")
    try:
        engine = SnmpEngine()
        transport = await UdpTransportTarget.create((ip, 161), timeout=2.0, retries=0)
        err_ind, err_status, _, var_binds = await get_cmd(
            engine,
            CommunityData(community),
            transport,
            ContextData(),
            ObjectType(ObjectIdentity("1.3.6.1.2.1.1.1.0")) # sysDescr
        )
        if err_ind:
            print(f"  [v2c FAIL] Error Indication: {err_ind}")
        elif err_status:
            print(f"  [v2c FAIL] Error Status: {err_status}")
        else:
            print(f"  [v2c SUCCESS] Response: {var_binds[0][1].prettyPrint()}")
            return True
    except Exception as e:
        print(f"  [v2c ERROR] {e}")
    return False

async def test_v3(ip, user, auth_key, priv_key):
    print(f"[*] Testing SNMPv3 on {ip} (User: {user})...")
    try:
        engine = SnmpEngine()
        transport = await UdpTransportTarget.create((ip, 161), timeout=3.0, retries=0)
        
        # Test with SHA / AES (common defaults)
        security = UsmUserData(
            user,
            authKey=auth_key,
            privKey=priv_key,
            authProtocol=usmHMACSHAAuthProtocol,
            privProtocol=usmAesCfb128Protocol
        )
        
        err_ind, err_status, _, var_binds = await get_cmd(
            engine,
            security,
            transport,
            ContextData(),
            ObjectType(ObjectIdentity("1.3.6.1.2.1.1.1.0")) # sysDescr
        )
        
        if err_ind:
            print(f"  [v3 FAIL] Error Indication: {err_ind}")
        elif err_status:
            print(f"  [v3 FAIL] Error Status: {err_status}")
        else:
            print(f"  [v3 SUCCESS] Response: {var_binds[0][1].prettyPrint()}")
            return True
    except Exception as e:
        print(f"  [v3 ERROR] {e}")
    return False

async def main():
    target = "172.16.130.6"
    await test_v2c(target, "public")
    print("-" * 20)
    await test_v3(target, "snmpuser", "password123", "password123")

if __name__ == "__main__":
    asyncio.run(main())
