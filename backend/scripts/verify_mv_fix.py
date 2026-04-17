import asyncio
import os
import sys

# Add backend and root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import AsyncSessionLocal
from sqlalchemy import text

async def verify_mv():
    print("=== VERIFYING DASHBOARD MATERIALIZED VIEW ===")
    async with AsyncSessionLocal() as db:
        try:
            res = await db.execute(text("SELECT * FROM asset.dashboard_stats_mv"))
            rows = res.all()
            print(f"MV has {len(rows)} rows of data.")
            for row in rows:
                print(f"  - {row}")
            
            if len(rows) > 0:
                print("\n[SUCCESS] Relation exists and contains data.")
            else:
                print("\n[WARNING] Relation exists but is EMPTY. (Expected if assets table is empty)")
        except Exception as e:
            print(f"\n[FAILED] Error accessing MV: {e}")

if __name__ == "__main__":
    asyncio.run(verify_mv())
