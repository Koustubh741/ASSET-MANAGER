import asyncio
import uuid
from app.database.database import AsyncSessionLocal
from app.models.models import AuditLog
from sqlalchemy import select

async def check_metrics():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(AuditLog).filter(AuditLog.action == 'AGENT_METRICS'))
        logs = res.scalars().all()
        print(f'Found {len(logs)} metrics logs')
        for log in logs:
            print(f'Agent {log.entity_id}: {log.details}')

if __name__ == "__main__":
    asyncio.run(check_metrics())
