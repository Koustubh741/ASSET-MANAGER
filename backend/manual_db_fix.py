import asyncio
from sqlalchemy import create_engine, text
import os

DATABASE_URL = "postgresql://postgres:Koustubh%40123@127.0.0.1:5432/ITSM"

async def manual_fix():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        print("\n--- MANUAL SCHEMA REMEDIATION ---")
        
        # Step 1: Add is_pilot if missing
        print("Checking asset.assets for is_pilot...")
        try:
            conn.execute(text("ALTER TABLE asset.assets ADD COLUMN IF NOT EXISTS is_pilot BOOLEAN NOT NULL DEFAULT FALSE;"))
            conn.commit()
            print("  -> Column 'is_pilot' added (or already exists).")
        except Exception as e:
            print(f"  -> ERROR adding is_pilot: {e}")
            conn.rollback()

        # Step 2: Ensure system schema has gen_random_uuid() or similar if needed
        # (Already exists based on previous migrations)

        print("\n--- SCHEMA REMEDIATION COMPLETE ---")

    engine.dispose()

if __name__ == "__main__":
    asyncio.run(manual_fix())
