
import asyncio
from sqlalchemy import select
from app.database.database import AsyncSessionLocal
from app.models.models import Asset

async def inspectX():
    async with AsyncSessionLocal() as db:
        print("Checking aws-prod-web-01 serials:")
        res = await db.execute(select(Asset).filter(Asset.name == 'aws-prod-web-01'))
        rows = res.scalars().all()
        for r in rows:
            print(f"ID: {r.id}, SN: {r.serial_number}, Status: {r.status}")

if __name__ == "__main__":
    asyncio.run(inspectX())
