import asyncio
import os
import sys
from sqlalchemy import select

# Add parent directory to path to reach app module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import AsyncSessionLocal
from app.models.models import AgentConfiguration

async def check_snmp_config():
    print("[*] Checking SNMP Agent Configuration in Database...")
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(AgentConfiguration).where(AgentConfiguration.agent_id == 'agent-snmp')
        )
        configs = result.scalars().all()
        
        if not configs:
            print("[!] No configuration found for agent-snmp!")
            return

        print(f"[+] Found {len(configs)} configuration keys:")
        for cfg in configs:
            val = "***** (Sensitive)" if cfg.is_sensitive else cfg.config_value
            print(f"    - {cfg.config_key}: {val}")

if __name__ == "__main__":
    asyncio.run(check_snmp_config())
