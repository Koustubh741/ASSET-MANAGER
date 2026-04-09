import psycopg2
from app.database.database import SQLALCHEMY_DATABASE_URL
import os

def apply_indexes():
    print("Applying performance indexes to ensure dashboard speed...")
    # SQLALCHEMY_DATABASE_URL example: postgresql+asyncpg://user:pass@host:port/db
    # We need to convert it for psycopg2
    url = str(SQLALCHEMY_DATABASE_URL).replace("postgresql+asyncpg://", "postgresql://")
    
    try:
        conn = psycopg2.connect(url)
        conn.autocommit = True
        cur = conn.cursor()
        
        # 1. Asset created_at
        print("Creating index ix_asset_created_at...")
        cur.execute("CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_asset_created_at ON asset.assets (created_at);")
        
        # 2. Ticket created_at
        print("Creating index ix_tickets_created_at...")
        cur.execute("CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_tickets_created_at ON public.tickets (created_at);")
        
        # 3. Purchase orders created_at
        print("Creating index ix_purchase_orders_created_at...")
        cur.execute("CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_purchase_orders_created_at ON public.purchase_orders (created_at);")
        
        cur.close()
        conn.close()
        print("Manual optimization complete.")
    except Exception as e:
        print(f"Index creation failed: {e}")

if __name__ == "__main__":
    apply_indexes()
