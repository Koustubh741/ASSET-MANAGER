import os
import sys
import asyncio

sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database.database import SessionLocal
from app.services.vulnerability_service import sync_vulnerability_mappings

async def main():
    # Use the async session maker
    from app.database.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        await sync_vulnerability_mappings(db)

if __name__ == "__main__":
    asyncio.run(main())

