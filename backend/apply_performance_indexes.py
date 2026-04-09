import asyncio
import sys
from sqlalchemy import text
from app.database.database import engine

async def apply_indexes():
    print("Checking and applying indexes...")
    async with engine.connect() as conn:
        # Check assets index
        res = await conn.execute(text("SELECT indexname FROM pg_indexes WHERE tablename = 'assets' AND indexname = 'ix_asset_created_at';"))
        if not res.scalar():
            print("Creating index ix_asset_created_at...")
            await conn.execute(text("CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_asset_created_at ON asset.assets (created_at);"))
        else:
            print("Index ix_asset_created_at already exists.")

        # Check tickets index
        res = await conn.execute(text("SELECT indexname FROM pg_indexes WHERE tablename = 'tickets' AND indexname = 'ix_tickets_created_at';"))
        if not res.scalar():
            print("Creating index ix_tickets_created_at...")
            await conn.execute(text("CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_tickets_created_at ON tickets (created_at);"))
        else:
            print("Index ix_tickets_created_at already exists.")

        # Check purchase_orders index
        res = await conn.execute(text("SELECT indexname FROM pg_indexes WHERE tablename = 'purchase_orders' AND indexname = 'ix_purchase_orders_created_at';"))
        if not res.scalar():
            print("Creating index ix_purchase_orders_created_at...")
            await conn.execute(text("CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_purchase_orders_created_at ON purchase_orders (created_at);"))
        else:
            print("Index ix_purchase_orders_created_at already exists.")

        await conn.commit()
    print("Optimization complete.")

if __name__ == "__main__":
    try:
        asyncio.run(apply_indexes())
    except Exception as e:
        print(f"Error: {e}")
