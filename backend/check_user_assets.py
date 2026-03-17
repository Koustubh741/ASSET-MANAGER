
import asyncio
import os
import sys

sys.path.append(os.getcwd())

from app.database.database import AsyncSessionLocal
from app.models.models import Ticket, Asset, User
from sqlalchemy import select

async def check_user_assets():
    async with AsyncSessionLocal() as db:
        # Get all technical unlinked tickets
        res_t = await db.execute(select(Ticket).where(Ticket.related_asset_id == None))
        tickets = res_t.scalars().all()
        
        technical_categories = ["Hardware", "Software", "BIOS", "Performance", "Display", "Network"]
        unlinked_tech = [t for t in tickets if t.category in technical_categories or any(kw in (t.subject or "").lower() for kw in ["error", "fail", "broken"])]
        
        print(f"Total Unlinked Technical Tickets: {len(unlinked_tech)}")
        
        # Unique requestors
        uids = {t.requestor_id for t in unlinked_tech if t.requestor_id}
        
        for uid in uids:
            res_u = await db.execute(select(User).where(User.id == uid))
            user = res_u.scalars().first()
            if not user: continue
            
            res_a = await db.execute(select(Asset).where(Asset.assigned_to_id == uid))
            assets = res_a.scalars().all()
            
            user_tickets = [t for t in unlinked_tech if t.requestor_id == uid]
            print(f"\nUser: {user.full_name} ({user.email}) | Role: {user.role}")
            print(f"  - Owned Assets: {[a.vendor for a in assets]}")
            print(f"  - Unlinked Tickets: {[t.subject for t in user_tickets]}")

if __name__ == "__main__":
    asyncio.run(check_user_assets())
