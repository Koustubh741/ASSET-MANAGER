import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.getcwd(), "backend"))

from app.database.database import AsyncSessionLocal
from app.models.models import AgentConfiguration
from sqlalchemy import select
from app.services.encryption_service import decrypt_value

async def check():
    async with AsyncSessionLocal() as db:
        r = await db.execute(select(AgentConfiguration).where(AgentConfiguration.agent_id == 'agent-snmp'))
        rows = r.scalars().all()
        d = {}
        for row in rows:
            d[row.config_key] = decrypt_value(row.config_value) if row.is_sensitive else row.config_value
        print("[*] SNMP agent config as returned by GET /agents/agent-snmp/config:")
        for k, v in d.items():
            masked = "***" if row.is_sensitive and k == row.config_key else v  # show masked for sensitive
            print(f"  {k}: {v}")

asyncio.run(check())
