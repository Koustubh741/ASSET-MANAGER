import asyncio
from sqlalchemy import text
from app.database.database import AsyncSessionLocal

async def setup_materialized_view():
    """
    Initialize the Pre-Aggregation Layer (Materialized View).
    Refactored to execute statements sequentially to avoid transaction issues.
    """
    async with AsyncSessionLocal() as db:
        print("--- Initializing Dashboard Pre-Aggregation Layer ---")
        
        # 1. Statements to execute sequentially
        statements = [
            "DROP MATERIALIZED VIEW IF EXISTS asset.dashboard_stats_mv;",
            """
            CREATE MATERIALIZED VIEW asset.dashboard_stats_mv AS
            SELECT 
                'status' as grouping_type,
                status as grouping_name,
                count(*) as count
            FROM asset.assets GROUP BY status
            UNION ALL
            SELECT 'segment', segment, count(*) FROM asset.assets GROUP BY segment
            UNION ALL
            SELECT 'type', type, count(*) FROM asset.assets GROUP BY type
            UNION ALL
            SELECT 'location', location, count(*) FROM asset.assets GROUP BY location;
            """,
            "CREATE UNIQUE INDEX idx_mv_grouping ON asset.dashboard_stats_mv (grouping_type, grouping_name);"
        ]
        
        try:
            for sql in statements:
                print(f"Executing step...")
                await db.execute(text(sql))
            
            await db.commit()
            print("SUCCESS")
        except Exception as e:
            await db.rollback()
            print(f"FAILED: {e}")

if __name__ == "__main__":
    asyncio.run(setup_materialized_view())
