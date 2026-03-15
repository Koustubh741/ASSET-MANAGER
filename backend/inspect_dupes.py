
import asyncio
from sqlalchemy import select, func
from app.database.database import AsyncSessionLocal
from app.models.models import Asset

async def inspectX():
    async with AsyncSessionLocal() as db:
        print("Checking aws-prod-web-01 details:")
        res = await db.execute(select(Asset).filter(Asset.name == 'aws-prod-web-01'))
        rows = res.scalars().all()
        for r in rows:
            ident = r.specifications.get('Agent ID') if r.specifications else 'NO ID'
            print(f"ID: {r.id}, SN: {r.serial_number}, AgentID: {ident}, Updated: {getattr(r, 'updated_at', 'N/A')}")

        print("\nChecking DESKTOP-78I99HT details:")
        res = await db.execute(select(Asset).filter(Asset.name == 'DESKTOP-78I99HT'))
        rows = res.scalars().all()
        for r in rows:
            ident = r.specifications.get('Agent ID') if r.specifications else 'NO ID'
            print(f"ID: {r.id}, SN: {r.serial_number}, AgentID: {ident}, Updated: {getattr(r, 'updated_at', 'N/A')}")

if __name__ == "__main__":
    asyncio.run(inspectX())
