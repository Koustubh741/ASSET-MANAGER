import asyncio
import os
import sys
from sqlalchemy import text

# Add backend and root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import AsyncSessionLocal

async def add_protocol_id_migration():
    print("=== ADDING PROTOCOL_ID COLUMN ===")
    async with AsyncSessionLocal() as db:
        try:
            # Add protocol_id
            await db.execute(text('ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS protocol_id VARCHAR(100) UNIQUE'))
            
            await db.commit()
            print("SUCCESS: Added protocol_id column to auth.users")
        except Exception as e:
            await db.rollback()
            print(f"FAILURE: Could not apply migration: {e}")

if __name__ == "__main__":
    asyncio.run(add_protocol_id_migration())
