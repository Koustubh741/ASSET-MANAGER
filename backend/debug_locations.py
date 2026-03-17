import asyncio
import os
import sys

# Add current directory to path
sys.path.append(os.getcwd())

from app.database.database import get_db
from app.models.models import Asset
from sqlalchemy.future import select

async def debug_locations():
    LOCATIONS = [
        "New York HQ",
        "London Office",
        "San Francisco",
        "Singapore",
        "Tokyo",
        "Mumbai",
        "Berlin",
        "Sydney",
        "Toronto",
        "Dubai",
        "Remote",
        "IT Warehouse",
        "Data Center 1",
        "Data Center 2",
    ]
    
    print("Testing get_locations logic...")
    try:
        async for db in get_db():
            for loc in LOCATIONS:
                print(f"Checking location: {loc}")
                query = select(Asset).filter(Asset.location == loc)
                result = await db.execute(query)
                assets = result.scalars().all()
                print(f"  Found {len(assets)} assets")
            break
        print("Success!")
    except Exception as e:
        print(f"Error in debug_locations: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_locations())
