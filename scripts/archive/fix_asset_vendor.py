from backend.app.database.database import get_db_context
from backend.app.models.models import Asset
import asyncio
from sqlalchemy import select, update

async def fix_asset_vendor():
    async with get_db_context() as session:
        # Update the vendor to Fortinet for the specific asset
        stmt = update(Asset).where(Asset.name == 'Cache_Digitech_Primary').values(vendor='Fortinet')
        await session.execute(stmt)
        await session.commit()
        print("Asset vendor updated to Fortinet")

if __name__ == "__main__":
    asyncio.run(fix_asset_vendor())
