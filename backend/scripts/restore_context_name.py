import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.getcwd(), "backend"))

from app.database.database import AsyncSessionLocal
from app.models.models import AgentConfiguration
from sqlalchemy import select

async def restore_context():
    async with AsyncSessionLocal() as db:
        # Check if contextName key exists
        stmt = select(AgentConfiguration).where(
            AgentConfiguration.agent_id == 'agent-snmp',
            AgentConfiguration.config_key == 'contextName'
        )
        result = await db.execute(stmt)
        existing = result.scalars().first()
        
        if existing:
            existing.config_value = 'vlan100'
            print("[*] Updated contextName to vlan100")
        else:
            new_config = AgentConfiguration(
                agent_id='agent-snmp',
                config_key='contextName',
                config_value='vlan100',
                is_sensitive=False
            )
            db.add(new_config)
            print("[*] Created contextName key with vlan100")
            
        await db.commit()

asyncio.run(restore_context())
