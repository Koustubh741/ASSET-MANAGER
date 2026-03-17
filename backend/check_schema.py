import asyncio
import os
import sys

# Add current directory to path so we can import app
sys.path.append(os.getcwd())

from app.database.database import get_db
from sqlalchemy import text

async def check_schema():
    print("Checking database schema for asset.assets...")
    try:
        async for db in get_db():
            # Query column names
            result = await db.execute(text("SELECT column_name FROM information_schema.columns WHERE table_schema = 'asset' AND table_name = 'assets'"))
            cols = [row[0] for row in result.fetchall()]
            print(f"Columns in asset.assets: {cols}")
            
            # Query a sample row to see actual data structure
            result = await db.execute(text("SELECT * FROM asset.assets LIMIT 1"))
            keys = result.keys()
            print(f"Result keys (SQLAlchemy): {list(keys)}")
            
            row = result.fetchone()
            if row:
                print(f"Sample row: {row._asdict()}")
            else:
                print("No rows found in asset.assets")
                
            break
    except Exception as e:
        print(f"Error checking schema: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(check_schema())
