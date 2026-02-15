"""
Migration script to create asset_inventory table
"""
import sys
import os

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import engine, SessionLocal
from sqlalchemy import text

def migrate():
    print("=== MIGRATING ASSET INVENTORY TABLE ===")
    
    # Create table SQL
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS asset.asset_inventory (
        id VARCHAR PRIMARY KEY,
        asset_id VARCHAR NOT NULL UNIQUE,
        location VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Available',
        stocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS ix_asset_asset_inventory_id ON asset.asset_inventory (id);
    CREATE INDEX IF NOT EXISTS ix_asset_asset_inventory_asset_id ON asset.asset_inventory (asset_id);
    """
    
    with engine.connect() as connection:
        try:
            connection.execute(text(create_table_sql))
            connection.commit()
            print("Successfully created 'asset.asset_inventory' table.")
        except Exception as e:
            print(f"Error creating table: {e}")

if __name__ == "__main__":
    migrate()
