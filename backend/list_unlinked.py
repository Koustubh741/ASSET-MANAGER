
import asyncio
import os
import sys

sys.path.append(os.getcwd())

from app.database.database import AsyncSessionLocal
from app.models.models import Ticket, Asset, User
from sqlalchemy import select

async def list_unlinked_tickets():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Ticket))
        tickets = result.scalars().all()
        
        technical_categories = ["Hardware", "Software", "BIOS", "Performance", "Display", "Network"]
        
        unlinked_tech = []
        for t in tickets:
            if not t.related_asset_id:
                is_tech = t.category in technical_categories or any(kw in (t.subject or "").lower() for kw in ["error", "fail", "broken"])
                if is_tech:
                    unlinked_tech.append(t)

        print(f"Total Unlinked Technical Tickets: {len(unlinked_tech)}")
        for t in unlinked_tech:
            print(f"- ID: {t.id} | Subject: '{t.subject}' | Category: {t.category} | Created: {t.created_at}")

if __name__ == "__main__":
    asyncio.run(list_unlinked_tickets())
