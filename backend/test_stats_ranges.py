
import asyncio
import httpx
import json

async def test_stats_ranges():
    # Note: Using mock data might be necessary if no real data exists
    url = "http://localhost:8000/api/v1/projects/" # Wait, I don't have the base URL right
    # Actually, I'll use the internal database session for testing to avoid auth issues in script
    from app.database.database import AsyncSessionLocal
    from app.models.models import Ticket
    from sqlalchemy import select, func, text
    import datetime

    async with AsyncSessionLocal() as db:
        print("Checking ticket counts for ranges...")
        
        for days in [7, 30, 90]:
            query = select(func.count(Ticket.id)).where(
                Ticket.created_at >= func.now() - text(f"INTERVAL '{days} days'")
            )
            res = await db.execute(query)
            count = res.scalar()
            print(f"Range {days} days: {count} tickets")

        # Check total tickets
        query = select(func.count(Ticket.id))
        res = await db.execute(query)
        total = res.scalar()
        print(f"Total tickets in DB: {total}")

if __name__ == "__main__":
    asyncio.run(test_stats_ranges())
