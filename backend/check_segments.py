import asyncio
from sqlalchemy import text
from app.database.database import async_engine

async def check_segments():
    async with async_engine.connect() as conn:
        res = await conn.execute(text("SELECT segment, count(*) FROM asset.assets GROUP BY segment"))
        print("--- Asset Segments ---")
        for row in res:
            print(f"Segment: '{row[0]}', Count: {row[1]}")
            
        res_mv = await conn.execute(text("SELECT grouping_type, grouping_name, count FROM asset.dashboard_stats_mv WHERE grouping_type = 'segment'"))
        print("\n--- Materialized View Segments ---")
        for row in res_mv:
            print(f"MV Segment: '{row[1]}', Count: {row[2]}")

if __name__ == "__main__":
    asyncio.run(check_segments())
