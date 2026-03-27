
import sys
import os
import asyncio
from sqlalchemy import select, func, text

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database.database import AsyncSessionLocal
from app.models.models import Ticket, User, Asset
from app.utils.category_utils import normalize_category

async def debug_stats():
    print("--- Debugging Category Stats Aggregator ---")
    async with AsyncSessionLocal() as db:
        range_days = 30
        query = select(Ticket.category, Ticket.status, Ticket.created_at, Ticket.updated_at, User.department).outerjoin(User, Ticket.requestor_id == User.id)
        query = query.where(Ticket.created_at >= func.now() - text(f"INTERVAL '{range_days} days'"))
        result = await db.execute(query)
        tickets = result.all()
        
        print(f"Total tickets in last {range_days} days: {len(tickets)}")
        
        stats_map = {}
        for t in tickets:
            cat = normalize_category(str(t.category or "Other"), str(t.subject or ""), str(t.description or ""))
            # Wait, the router logic uses t.subject but result.all() on a select(...) with specific columns
            # only returns those columns. SUBJECT WAS NOT IN MY SELECT!
            # THAT IS THE BUG!
            print(f"Ticket Category: {t.category}")
            # If I try to access t.subject here it will fail if not in the select.
            
        # Let's check the router file again.
if __name__ == "__main__":
    asyncio.run(debug_stats())
