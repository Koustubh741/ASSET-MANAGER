import asyncio
from app.database.database import AsyncSessionLocal
from app.models.models import AgentCommand
from sqlalchemy import select, desc

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(AgentCommand).order_by(desc(AgentCommand.created_at)).limit(50))
        cmds = res.scalars().all()
        print("--- Recent Agent Commands ---")
        for c in cmds:
            print(f"ID: {c.id} | Command: {c.command} | Status: {c.status} | Created: {c.created_at}")

if __name__ == "__main__":
    asyncio.run(check())
