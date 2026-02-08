from pysnmp.hlapi.asyncio import *
import asyncio
from typing import List, Dict, Any, Optional
import ipaddress
import logging
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

# Standard MIB-2 OIDs
OIDS = {
    "sysDescr": "1.3.6.1.2.1.1.1.0",
    "sysObjectID": "1.3.6.1.2.1.1.2.0",
    "sysUpTime": "1.3.6.1.2.1.1.3.0",
    "sysName": "1.3.6.1.2.1.1.5.0",
    "sysLocation": "1.3.6.1.2.1.1.6.0"
}

class SNMPScanner:
    def __init__(self, community: str = "public", port: int = 161):
        self.community = community
        self.port = port

    async def get_device_info(self, ip: str) -> Optional[Dict[str, Any]]:
        """
        Poll a device for basic MIB-2 information.
        """
        try:
            snmp_engine = SnmpEngine()
            results = {}
            
            for name, oid in OIDS.items():
                error_indication, error_status, error_index, var_binds = await getCmd(
                    snmp_engine,
                    CommunityData(self.community),
                    UdpTransportTarget((ip, self.port), timeout=1, retries=0),
                    ContextData(),
                    ObjectType(ObjectIdentity(oid))
                )

                if error_indication:
                    return None # Device not responding or not SNMP-enabled
                elif error_status:
                    logger.warning(f"SNMP Error for {ip}: {error_status.prettyPrint()}")
                    continue
                else:
                    for var_bind in var_binds:
                        results[name] = var_bind[1].prettyPrint()

            if not results:
                return None

            return self._parse_results(ip, results)

        except Exception as e:
            logger.error(f"Failed to poll {ip}: {e}")
            return None

    def _parse_results(self, ip: str, raw: Dict[str, str]) -> Dict[str, Any]:
        """
        Turn raw OID values into an Asset-compatible dictionary.
        """
        descr = raw.get("sysDescr", "").lower()
        
        # Simple vendor detection
        vendor = "Unknown"
        if "cisco" in descr: vendor = "Cisco"
        elif "hp" in descr or "hewlett-packard" in descr: vendor = "HP"
        elif "ubiquiti" in descr or "uap" in descr: vendor = "Ubiquiti"
        elif "mikrotik" in descr: vendor = "MikroTik"
        elif "brother" in descr: vendor = "Brother"
        elif "canon" in descr: vendor = "Canon"
        
        # Simple type detection
        asset_type = "Networking"
        if "printer" in descr or "laserjet" in descr:
            asset_type = "Printer"
        elif "switch" in descr:
            asset_type = "Switch"
        elif "router" in descr:
            asset_type = "Router"
            
        return {
            "name": raw.get("sysName", ip),
            "type": asset_type,
            "vendor": vendor,
            "model": "Generic SNMP Device",
            "serial_number": f"SNMP-{uuid.uuid4().hex[:8].upper()}", # Real SN often requires vendor-specific MIBs
            "ip_address": ip,
            "specifications": {
                "Description": raw.get("sysDescr", "N/A"),
                "Location": raw.get("sysLocation", "N/A"),
                "Uptime": raw.get("sysUpTime", "N/A"),
                "Discovery Method": "Agentless SNMP"
            }
        }

async def scan_network_range(cidr: str, community: str = "public") -> List[Dict[str, Any]]:
    """
    Sweep a network range and poll responsive devices.
    """
    scanner = SNMPScanner(community=community)
    network = ipaddress.ip_network(cidr)
    
    tasks = []
    for ip in network.hosts():
        tasks.append(scanner.get_device_info(str(ip)))
    
    results = await asyncio.gather(*tasks)
    return [r for r in results if r is not None]
