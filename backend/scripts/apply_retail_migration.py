import asyncio
import os
import sys
from sqlalchemy import text

# Add backend and root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import AsyncSessionLocal

async def apply_retail_migration():
    print("=== APPLYING RETAIL SCHEMA EXPANSION ===")
    async with AsyncSessionLocal() as db:
        try:
            # Check if columns exist first (optional but safer)
            # Add loc_type
            await db.execute(text('ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS loc_type VARCHAR(50)'))
            # Add sub_dept
            await db.execute(text('ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS sub_dept VARCHAR(50)'))
            # Add designation
            await db.execute(text('ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS designation VARCHAR(50)'))
            
            await db.commit()
            print("SUCCESS: Added loc_type, sub_dept, and designation columns to auth.users")
        except Exception as e:
            await db.rollback()
            print(f"FAILURE: Could not apply migration: {e}")

if __name__ == "__main__":
    asyncio.run(apply_retail_migration())
