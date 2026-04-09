import asyncio
import os
import sys
from sqlalchemy.future import select
from sqlalchemy import delete

# Add the 'backend' directory to sys.path
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if base_dir not in sys.path:
    sys.path.append(base_dir)

from app.database.database import AsyncSessionLocal
from app.models.models import Ticket

async def cleanup_test_tickets():
    """
    Remove all test tickets to prepare for a clean re-run.
    """
    async with AsyncSessionLocal() as db:
        # Delete tickets with test subjects
        # We use a filter to target ONLY our test tickets
        stmt = delete(Ticket).where(Ticket.subject.ilike("%INTERNAL:%") | Ticket.subject.ilike("%EXTERNAL:%"))
        result = await db.execute(stmt)
        await db.commit()
        print(f"[CLEANUP] Deleted {result.rowcount} test tickets.")

if __name__ == "__main__":
    asyncio.run(cleanup_test_tickets())
