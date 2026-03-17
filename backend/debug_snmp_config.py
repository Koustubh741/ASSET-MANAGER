import asyncio
import os
import sys

# Add backend to path
backend_path = os.path.dirname(os.path.abspath(__file__))
sys.path.append(backend_path)

from app.database.database import AsyncSessionLocal, engine
from app.models.models import AgentConfiguration
from sqlalchemy import select

async def get_snmp_config():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(AgentConfiguration).where(AgentConfiguration.agent_id == 'agent-snmp')
        )
        config_rows = result.scalars().all()
        config = {row.config_key: row.config_value for row in config_rows}
        
        print(f"--- SNMP Configuration ---")
        for k, v in config.items():
            print(f"{k}: {v}")
        print(f"--------------------------")

if __name__ == "__main__":
    asyncio.run(get_snmp_config())
