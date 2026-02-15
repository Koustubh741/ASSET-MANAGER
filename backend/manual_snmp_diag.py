import asyncio
import os
import sys
import ipaddress
import logging

# Add backend to path
backend_path = os.path.dirname(os.path.abspath(__file__))
sys.path.append(backend_path)

from app.database.database import AsyncSessionLocal
from app.models.models import AgentConfiguration
from app.services.encryption_service import decrypt_value
from app.services.snmp_service import SNMPScanner
from sqlalchemy import select

# Set up logging to console
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("manual_diagnostic")

async def run_diagnostic():
    async with AsyncSessionLocal() as db:
        logger.info("Fetching SNMP configuration from database...")
        result = await db.execute(
            select(AgentConfiguration).where(AgentConfiguration.agent_id == 'agent-snmp')
        )
        config_rows = result.scalars().all()
        config = {row.config_key: row.config_value for row in config_rows}
        
    if not config:
        logger.error("No SNMP configuration found in database.")
        return

    # Decrypt credentials
    logger.info("Decrypting credentials...")
    community = decrypt_value(config.get('communityString'))
    username = config.get('username')
    auth_key = decrypt_value(config.get('authKey'))
    priv_key = decrypt_value(config.get('privKey'))
    network_range = config.get('networkRange', '127.0.0.1/32')
    snmp_version = config.get('snmpVersion', 'v2c')
    context_name = config.get('contextName', '')
    
    logger.info(f"Target Range: {network_range}")
    logger.info(f"SNMP Version: {snmp_version}")
    
    v3_data = None
    if snmp_version == 'v3':
        v3_data = {
            'username': username,
            'authKey': auth_key,
            'privKey': priv_key,
            'authProtocol': config.get('authProtocol', 'SHA'),
            'privProtocol': config.get('privProtocol', 'AES')
        }
        logger.info(f"v3 User: {username}, Auth: {v3_data['authProtocol']}, Priv: {v3_data['privProtocol']}")
    else:
        logger.info(f"v2c Community (Decrypted): {community}")

    scanner = SNMPScanner(communities=[community] if community else ["public"], v3_data=v3_data, context_name=context_name)
    
    try:
        network = ipaddress.ip_network(network_range, strict=False)
        # Scan first 5 IPs in range (excluding .0 and .255 usually)
        ips_to_scan = list(network.hosts())[:5]
        logger.info(f"Attempting to scan IPs: {[str(ip) for ip in ips_to_scan]}")
        
        for ip in ips_to_scan:
            ip_str = str(ip)
            logger.info(f"--- Probing {ip_str} ---")
            info = await scanner.get_device_info(ip_str)
            if info:
                logger.info(f"SUCCESS found device at {ip_str}:")
                logger.info(f"  Name: {info['name']}")
                logger.info(f"  Type: {info['type']}")
                logger.info(f"  Vendor: {info['vendor']}")
                logger.info(f"  Serial: {info['serial_number']}")
            else:
                logger.warning(f"FAILURE: No SNMP response from {ip_str}")
                
    except Exception as e:
        logger.error(f"Diagnostic failed: {str(e)}", exc_info=True)

if __name__ == "__main__":
    asyncio.run(run_diagnostic())
