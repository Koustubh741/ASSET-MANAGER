import sys
import os
from sqlalchemy import text

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import engine

def apply_migration():
    print("Checking for new columns in asset.assets table...")
    with engine.connect() as conn:
        # Check standard postgres information_schema
        check_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'asset' AND table_name = 'assets'
        """)
        columns = [row[0] for row in conn.execute(check_query)]
        
        if 'contract_expiry' not in columns:
            print("Adding column contract_expiry...")
            conn.execute(text("ALTER TABLE asset.assets ADD COLUMN contract_expiry DATE"))
        
        if 'license_expiry' not in columns:
            print("Adding column license_expiry...")
            conn.execute(text("ALTER TABLE asset.assets ADD COLUMN license_expiry DATE"))
            
        conn.commit()
    print("Migration completed.")

if __name__ == "__main__":
    apply_migration()
