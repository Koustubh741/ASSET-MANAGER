
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:Koustubh%40123@127.0.0.1:5432/ITSM"

async def purge_test():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        print("Purging 'RootFix_Verification_Dept' records...")
        
        # 1. Update tickets to move them out of the test dept or delete them
        # For simplicity, we'll just rename the department in the users if it's assigned to them
        # or delete tickets that reference it.
        
        await conn.execute(text("DELETE FROM support.tickets WHERE subject LIKE '%RootFix%'"))
        await conn.execute(text("DELETE FROM support.assignment_groups WHERE name = 'RootFix_Verification_Dept'"))
        
        await conn.commit()
        print("Test records purged.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(purge_test())
