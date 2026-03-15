import asyncio
import os
import sys
from sqlalchemy import select

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from app.database.database import AsyncSessionLocal
from app.models.models import AgentConfiguration

async def check_config():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(AgentConfiguration).where(AgentConfiguration.agent_id == 'agent-snmp')
        )
        configs = result.scalars().all()
        for c in configs:
            print(f"{c.config_key}: {c.config_value} (Sensitive: {c.is_sensitive})")

if __name__ == "__main__":
    asyncio.run(check_config())
