import asyncio
import os
import sys

# Add backend and root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import AsyncSessionLocal
from sqlalchemy import text

async def recreate_dashboard_mv():
    print("=== RECREATING DASHBOARD MATERIALIZED VIEW ===")
    async with AsyncSessionLocal() as db:
        try:
            # 1. Drop if exists
            print("Dropping existing view (if any)...")
            await db.execute(text("DROP MATERIALIZED VIEW IF EXISTS asset.dashboard_stats_mv CASCADE"))
            
            # 2. Create the view
            # This aggregates by status and segment as expected by asset_service.py
            print("Creating Materialized View: asset.dashboard_stats_mv...")
            create_mv_sql = """
            CREATE MATERIALIZED VIEW asset.dashboard_stats_mv AS
            SELECT 
                'status'::text as grouping_type, 
                status as grouping_name, 
                count(*)::int as count 
            FROM asset.assets 
            GROUP BY status
            UNION ALL
            SELECT 
                'segment'::text as grouping_type, 
                segment as grouping_name, 
                count(*)::int as count 
            FROM asset.assets 
            GROUP BY segment;
            """
            await db.execute(text(create_mv_sql))
            
            # 3. Add unique index (Mandatory for CONCURRENTLY refresh)
            print("Creating Unique Index for concurrent refresh...")
            await db.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS ix_dashboard_stats_mv_unique 
                ON asset.dashboard_stats_mv (grouping_type, grouping_name);
            """))
            
            await db.commit()
            print("SUCCESS: Materialized View recreated and indexed.")
            
        except Exception as e:
            await db.rollback()
            print(f"FAILED: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(recreate_dashboard_mv())
