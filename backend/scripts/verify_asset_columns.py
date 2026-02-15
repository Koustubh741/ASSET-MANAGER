import os
import sys
from dotenv import load_dotenv

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database.database import engine
from sqlalchemy import text

def verify_asset_columns():
    load_dotenv('backend/.env')
    print("Verifying 'asset.assets' columns...")
    try:
        with engine.connect() as conn:
            query = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = 'asset' AND table_name = 'assets'
            """)
            result = conn.execute(query)
            columns = [row[0] for row in result.fetchall()]
            print(f"Columns found: {columns}")
            
            # Check for specific new fields from models.py
            fields = ['renewal_status', 'renewal_cost', 'renewal_reason', 'renewal_urgency', 'procurement_status', 'disposal_status']
            missing = [f for f in fields if f not in columns]
            if not missing:
                print("SUCCESS: All asset renewal/status columns are present.")
            else:
                print(f"INFO: Missing columns: {missing} (May be intended if not yet migrated)")
                
    except Exception as e:
        print(f"Error during verification: {e}")

if __name__ == "__main__":
    verify_asset_columns()
