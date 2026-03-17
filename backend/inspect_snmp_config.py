import asyncio
from sqlalchemy import select
from app.database.database import AsyncSessionLocal
from app.models.models import AgentConfiguration
from app.services.encryption_service import decrypt_value

async def inspect():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(AgentConfiguration).where(AgentConfiguration.agent_id == 'agent-snmp')
        )
        rows = result.scalars().all()
        print(f"--- SNMP Configuration ({len(rows)} entries) ---")
        for row in rows:
            val = row.config_value
            if row.is_sensitive:
                try:
                    val = decrypt_value(val)
                except:
                    val = "[DECRYPTION FAILED]"
            print(f"{row.config_key}: {val}")

if __name__ == "__main__":
    asyncio.run(inspect())
