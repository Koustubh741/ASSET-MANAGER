import asyncio
import sys
from sqlalchemy.future import select
from sqlalchemy import func

# Add project root to path
sys.path.append('d:/ASSET-MANAGER/backend')

from app.database.database import AsyncSessionLocal
from app.models.models import Ticket, User

async def check_stats():
    async with AsyncSessionLocal() as db:
        print("--- Ticket Status Counts ---")
        st_query = select(Ticket.status, func.count(Ticket.id)).group_by(Ticket.status)
        st_res = await db.execute(st_query)
        for status, count in st_res.all():
            print(f"Status: {status}, Count: {count}")

        print("\n--- Solver Stats ---")
        query = select(
            User.full_name,
            func.count(Ticket.id).label("resolved_count")
        ).join(User, Ticket.assigned_to_id == User.id).filter(
            Ticket.status == "RESOLVED"
        ).group_by(User.full_name)
        
        result = await db.execute(query)
        rows = result.all()
        if not rows:
            print("No resolved tickets found with an assigned technician.")
        for row in rows:
            print(f"Technician: {row.full_name}, Resolved: {row.resolved_count}")

if __name__ == "__main__":
    asyncio.run(check_stats())
