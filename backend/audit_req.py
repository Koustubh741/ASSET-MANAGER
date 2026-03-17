
import asyncio
from app.database.database import AsyncSessionLocal
from app.models.models import AssetRequest
from sqlalchemy import select

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(AssetRequest).filter(AssetRequest.id == '3fdda6a5-dd4a-4548-a302-fd9bb11c4eee'))
        r = res.scalars().first()
        if r:
            print(f"ID: {r.id}")
            print(f"Status: {r.status}")
            print(f"QC Status: {r.qc_status}")
            print(f"Procurement Finance Status: {r.procurement_finance_status}")
            print(f"User Acceptance Status: {r.user_acceptance_status}")
        else:
            print("Request not found")

if __name__ == "__main__":
    asyncio.run(check())
