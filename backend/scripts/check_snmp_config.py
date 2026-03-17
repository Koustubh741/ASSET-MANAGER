import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database.database import AsyncSessionLocal
from app.models.models import AgentConfiguration
from sqlalchemy import select

async def check():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(AgentConfiguration).where(AgentConfiguration.agent_id == 'agent-snmp'))
        rows = result.scalars().all()
        print(f"[*] Found {len(rows)} configuration entries for agent-snmp:")
        for row in rows:
            print(f"  {row.config_key}: {row.config_value} (Sensitive: {row.is_sensitive})")

if __name__ == "__main__":
    asyncio.run(check())
