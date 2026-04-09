import asyncio
import sys
import os

# Add backend to path
backend_path = "d:\\ASSET-MANAGER\\backend"
sys.path.append(backend_path)

from app.database.database import AsyncSessionLocal
from app.models.models import AuditLog
from sqlalchemy import select, desc

async def check_audit():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(AuditLog).order_by(desc(AuditLog.timestamp)).limit(10))
        logs = res.scalars().all()
        for log in logs:
            print(f"{log.timestamp} | {log.action} | {log.entity_type} | {log.details}")

if __name__ == "__main__":
    asyncio.run(check_audit())
