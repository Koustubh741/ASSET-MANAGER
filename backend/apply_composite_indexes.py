import asyncio
from sqlalchemy import text
from app.database.database import AsyncSessionLocal

async def apply_composite_indexes():
    """
    Applying 'Hybrid Architecture' Composite Indexes.
    Uses CONCURRENTLY to avoid blocking transactions.
    """
    async with AsyncSessionLocal() as db:
        print("--- Applying Smart Composite Indexes ---")
        indexes = [
            # 1. Assets: Status + Segment (Frequent Global Metric filter)
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_asset_status_segment ON asset.assets (status, segment);",
            # 2. Assets: Type + Status (Common dashboard groupings)
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_asset_type_status ON asset.assets (type, status);",
            # 3. Assets: Created + Status (Trend calculation)
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_asset_created_status ON asset.assets (created_at DESC, status);",
            # 4. Procurement: PO Status (Finance Dashboard)
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_status_recv ON procurement.purchase_orders (status) WHERE status = 'RECEIVED';",
            # 5. Tickets: Status + Created (Incident trend)
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_status_created ON support.tickets (status, created_at DESC);"
        ]
        
        for idx_sql in indexes:
            try:
                print(f"Executing: {idx_sql}")
                # Note: CONCURRENTLY cannot run inside a transaction block in some versions
                await db.execute(text("COMMIT")) # Ensure no pending TX
                await db.execute(text(idx_sql))
                print("SUCCESS")
            except Exception as e:
                print(f"FAILED: {e}")

if __name__ == "__main__":
    asyncio.run(apply_composite_indexes())
