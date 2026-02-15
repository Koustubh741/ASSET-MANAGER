import os
import sys
from dotenv import load_dotenv

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database.database import engine
from sqlalchemy import text

def verify_cloud_assets():
    load_dotenv('backend/.env')
    print("Checking for cloud assets in database...")
    try:
        with engine.connect() as conn:
            query = text("""
                SELECT name, vendor, type, serial_number 
                FROM asset.assets 
                WHERE vendor IN ('AWS', 'Azure')
            """)
            result = conn.execute(query)
            rows = result.fetchall()
            if rows:
                print(f"FOUND {len(rows)} cloud assets:")
                for row in rows:
                    print(f"- {row[0]} ({row[1]} {row[2]}) SN: {row[3]}")
            else:
                print("No cloud assets found.")
    except Exception as e:
        print(f"Error during verification: {e}")

if __name__ == "__main__":
    verify_cloud_assets()
