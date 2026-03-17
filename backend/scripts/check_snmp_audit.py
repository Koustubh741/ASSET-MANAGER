import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database.database import AsyncSessionLocal
from app.models.models import AuditLog
from sqlalchemy import select

async def check_audit():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(AuditLog).where(AuditLog.action.ilike('%SNMP%')).order_by(AuditLog.timestamp.desc()).limit(20))
        rows = result.scalars().all()
        print(f"[*] Found {len(rows)} SNMP-related audit entries:")
        for row in rows:
            print(f"  [{row.timestamp}] {row.action} - {row.details}")

if __name__ == "__main__":
    asyncio.run(check_audit())
