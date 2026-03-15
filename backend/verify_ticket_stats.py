import asyncio
import sys
from sqlalchemy.future import select
from sqlalchemy import func

# Add project root to path
sys.path.append('d:/ASSET-MANAGER/backend')

from app.database.database import engine
from app.models.models import Ticket

async def verify_stats():
    # Final attempt with standard AsyncEngine patterns
    async with engine.connect() as conn:
        # Check total tickets
        # In SQLAlchemy 2.0+ with AsyncEngine, engine.connect() returns an AsyncConnection
        # which IS an async context manager.
        result = await conn.execute(select(func.count(Ticket.id)))
        total = result.scalar()
        print(f"Total Tickets in DB: {total}")

        # Check grouping by category and status
        query = select(
            Ticket.category,
            Ticket.status,
            func.count(Ticket.id).label("count")
        ).group_by(Ticket.category, Ticket.status)
        
        result = await conn.execute(query)
        rows = result.all()
        
        print("\nStatistics by Category and Status:")
        print("-" * 40)
        for row in rows:
            print(f"Category: {row.category if row.category else 'None':<15} | Status: {row.status if row.status else 'None':<10} | Count: {row.count}")

if __name__ == "__main__":
    try:
        asyncio.run(verify_stats())
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error during verification: {e}")
