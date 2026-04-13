import asyncio
import sys
import os
sys.path.append(os.getcwd())

from sqlalchemy import text
from app.database.database import AsyncSessionLocal

async def refresh_mv():
    async with AsyncSessionLocal() as session:
        print("Refreshing dashboard_stats_mv (Root Fix)...")
        try:
            await session.execute(text("REFRESH MATERIALIZED VIEW asset.dashboard_stats_mv"))
            await session.commit()
            print("Refresh successful.")
        except Exception as e:
            print(f"Error refreshing MV: {e}")

if __name__ == "__main__":
    asyncio.run(refresh_mv())
