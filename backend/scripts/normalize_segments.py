import asyncio
import sys
import os

# Add backend to path
sys.path.append(os.getcwd())

from sqlalchemy import text
from app.database.database import AsyncSessionLocal

async def normalize_segments():
    async with AsyncSessionLocal() as session:
        print("Normalizing asset segments (Root Fix)...")
        
        # 1. Update fragmented segments to 'IT'
        fragmented = ['t', 'ayush', 'ubuntu', 'Infrastructure']
        
        for seg in fragmented:
            result = await session.execute(
                text("UPDATE asset.assets SET segment = 'IT' WHERE segment = :old"),
                {"old": seg}
            )
            print(f"Normalized segment '{seg}' -> 'IT': {result.rowcount} rows affected")
            
        # 2. Case normalization (ensure all segments are consistent)
        # Any 'it' -> 'IT', 'non-it' -> 'NON-IT'
        result_it = await session.execute(text("UPDATE asset.assets SET segment = 'IT' WHERE segment ILIKE 'it' AND segment != 'IT'"))
        result_nonit = await session.execute(text("UPDATE asset.assets SET segment = 'NON-IT' WHERE segment ILIKE 'non-it' AND segment != 'NON-IT'"))
        
        print(f"Fixed case for 'IT': {result_it.rowcount} rows")
        print(f"Fixed case for 'NON-IT': {result_nonit.rowcount} rows")
        
        await session.commit()
        print("Segment normalization complete.")

if __name__ == "__main__":
    asyncio.run(normalize_segments())
