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
from app.models.models import Ticket, User

async def final_cleanup():
    """
    Remove all test tickets AND test users created during this phase.
    """
    async with AsyncSessionLocal() as db:
        # 1. Delete tickets
        t_stmt = delete(Ticket).where(Ticket.subject.ilike("%INTERNAL:%") | Ticket.subject.ilike("%EXTERNAL:%"))
        t_result = await db.execute(t_stmt)
        
        # 2. Delete test users
        u_stmt = delete(User).where(User.email.ilike("%@itsm-test.com"))
        u_result = await db.execute(u_stmt)
        
        await db.commit()
        print(f"[CLEANUP] Deleted {t_result.rowcount} tickets and {u_result.rowcount} test users.")

if __name__ == "__main__":
    asyncio.run(final_cleanup())
