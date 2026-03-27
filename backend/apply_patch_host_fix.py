import sys
import os
# Add current and backend to path
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from sqlalchemy import text
from backend.app.database.database import engine

def apply_patch_host_schema():
    print("Connecting to database to check schema...")
    with engine.connect() as conn:
        # Check for columns in asset.system_patches
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'asset' 
            AND table_name = 'system_patches'
        """))
        columns = [row[0] for row in result.fetchall()]
        print(f"Existing columns: {columns}")

        if 'binary_url' not in columns:
            print("Adding binary_url column...")
            conn.execute(text("ALTER TABLE asset.system_patches ADD COLUMN binary_url VARCHAR(1000)"))
            conn.commit()
            print("SUCCESS: binary_url added.")
        else:
            print("Column binary_url already exists.")
        
        if 'is_custom' not in columns:
            print("Adding is_custom column...")
            conn.execute(text("ALTER TABLE asset.system_patches ADD COLUMN is_custom BOOLEAN DEFAULT FALSE NOT NULL"))
            conn.commit()
            print("SUCCESS: is_custom added.")
        else:
            print("Column is_custom already exists.")

if __name__ == "__main__":
    try:
        apply_patch_host_schema()
        print("Schema sync complete.")
    except Exception as e:
        print(f"Error syncing schema: {e}")
        import traceback
        traceback.print_exc()
