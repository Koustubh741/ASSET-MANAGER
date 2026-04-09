
import asyncio
import sys
import os
from sqlalchemy import select

# Add the project root to sys.path
sys.path.append(os.getcwd())

from backend.app.database.database import AsyncSessionLocal
from backend.app.models.models import AgentConfiguration
from backend.app.services.encryption_service import decrypt_value

async def dump_config():
    print("--- SNMP Agent Configuration Dump ---")
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(AgentConfiguration).where(AgentConfiguration.agent_id == 'agent-snmp')
        )
        rows = result.scalars().all()
        for row in rows:
            val = row.config_value
            if row.is_sensitive:
                try:
                    decrypted = decrypt_value(val)
                    print(f"Key: {row.config_key} | Sensitive: {row.is_sensitive} | Value: [ENCRYPTED] -> Decrypted: {decrypted}")
                except Exception as e:
                    print(f"Key: {row.config_key} | Sensitive: {row.is_sensitive} | Value: [ENCRYPTED] -> DECRYPTION FAILED: {e}")
            else:
                print(f"Key: {row.config_key} | Sensitive: {row.is_sensitive} | Value: {val}")

if __name__ == "__main__":
    asyncio.run(dump_config())
