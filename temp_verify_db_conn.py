import sys
import os

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.app.database.database import test_connection, get_connection_info, AsyncSessionLocal
import asyncio

def check_sync():
    print("Checking Synchronous Connection...")
    if test_connection():
        print("SUCCESS: Synchronous connection established.")
        print(f"Connection Info: {get_connection_info()}")
    else:
        print("FAILURE: Synchronous connection failed.")

async def check_async():
    print("\nChecking Asynchronous Connection...")
    try:
        async with AsyncSessionLocal() as session:
            from sqlalchemy import text
            result = await session.execute(text("SELECT 1"))
            if result.scalar() == 1:
                print("SUCCESS: Asynchronous connection established.")
            else:
                print("FAILURE: Asynchronous query returned unexpected result.")
    except Exception as e:
        print(f"FAILURE: Asynchronous connection failed: {e}")

if __name__ == "__main__":
    check_sync()
    asyncio.run(check_async())
