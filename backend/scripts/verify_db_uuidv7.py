import asyncio
import sys
import os
from sqlalchemy import select, delete

# Add backend root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import AsyncSessionLocal
from app.models.models import AuditLog
from app.utils.uuid_gen import get_uuid_str

async def manual_db_test():
    print("==================================================")
    print("  UUIDv7 Database Integration - Manual Test")
    print("==================================================")
    
    async with AsyncSessionLocal() as db:
        print("\n[Step 1] Creating new AuditLog record (testing default=get_uuid)...")
        # We will create a test AuditLog. We won't pass 'id', relying on the model default.
        test_action = "DB_TEST_UUIDV7_GEN"
        
        new_log = AuditLog(
            entity_type="SYSTEM_TEST",
            entity_id="test-entity-id",
            action=test_action,
            details={"test": "Verifying UUIDv7 generation in DB"}
        )
        
        db.add(new_log)
        await db.flush() # Flush to get the ID generated
        
        print(f"         Generated ID from SQLAlchemy model: {new_log.id}")
        
        # Verify the version of the generated ID BEFORE COMMIT
        version = new_log.id.version
        if version == 7:
            print("         [PASS] UUID version is 7 (in-memory).")
        else:
            print(f"         [FAIL] Expected UUID version 7, got {version}.")
            
        # Commit to real database
        print("\n[Step 2] Committing record to PostgreSQL database...")
        await db.commit()
        
        # In a new context or simply reading it back
        print("\n[Step 3] Fetching record back from the database...")
        result = await db.execute(select(AuditLog).filter(AuditLog.action == test_action))
        fetched_log = result.scalars().first()
        
        if not fetched_log:
            print("         [FAIL] Could not retrieve the record from the database!")
            sys.exit(1)
            
        print(f"         Retrieved ID from Database:         {fetched_log.id}")
        
        if str(fetched_log.id) == str(new_log.id):
            print("         [PASS] Database ID matches the generated ID.")
        else:
            print("         [FAIL] Mismatch between generated ID and database ID!")
            
        # Check version again from the fetched UUID
        db_version = fetched_log.id.version
        if db_version == 7:
            print(f"         [PASS] Fetched UUID version is 7. (UUID: {fetched_log.id})")
            print("         Database integration is fully verified and working!")
        else:
            print(f"         [FAIL] Fetched UUID version is {db_version}, expecting 7.")
            
        print("\n[Step 4] Cleaning up test record...")
        await db.execute(delete(AuditLog).filter(AuditLog.action == test_action))
        await db.commit()
        print("         [PASS] Test record deleted successfully.")

    print("\n==================================================")
    print("  DB Test Complete.")
    print("==================================================")

if __name__ == "__main__":
    # Fix encoding for windows
    sys.stdout.reconfigure(encoding='utf-8')
    asyncio.run(manual_db_test())
