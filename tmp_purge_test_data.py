import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.app.database.database import AsyncSessionLocal as async_session
from backend.app.models.models import User, Ticket
from sqlalchemy import delete

async def purge_test_data():
    print("Purging RootFix_Verification_Dept test artifacts...")
    async with async_session() as db:
        # Delete tickets with "Root Fix Diagnostic" in subject
        t_del = await db.execute(delete(Ticket).where(Ticket.subject == "Root Fix Diagnostic"))
        # Delete user with "RootFix_Verification_Dept"
        u_del = await db.execute(delete(User).where(User.department == "RootFix_Verification_Dept"))
        await db.commit()
        print(f"Purged {t_del.rowcount} tickets and {u_del.rowcount} users.")

if __name__ == "__main__":
    asyncio.run(purge_test_data())
