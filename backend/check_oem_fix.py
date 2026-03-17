
import asyncio
import os
import sys
from datetime import datetime

sys.path.append(os.getcwd())

from app.database.database import AsyncSessionLocal
from app.models.models import Ticket, Asset, User
from sqlalchemy import select

async def check_oem_attribution():
    async with AsyncSessionLocal() as db:
        # 1. Fetch all tickets
        result = await db.execute(select(Ticket))
        tickets = result.scalars().all()
        
        # 2. Fetch all assets
        asset_result = await db.execute(select(Asset))
        assets = asset_result.scalars().all()
        
        user_assets = {}
        for a in assets:
            if a.assigned_to_id:
                uid = str(a.assigned_to_id)
                if uid not in user_assets: user_assets[uid] = []
                user_assets[uid].append(a)

        unlinked_tech = []
        attributable = []
        
        technical_categories = ["Hardware", "Software", "BIOS", "Performance", "Display", "Network"]
        
        for t in tickets:
            if not t.related_asset_id:
                is_tech = t.category in technical_categories or any(kw in (t.subject or "").lower() for kw in ["error", "fail", "broken"])
                if is_tech:
                    unlinked_tech.append(t)
                    if t.requestor_id:
                        uid_str = str(t.requestor_id)
                        owned = user_assets.get(uid_str, [])
                        if len(owned) > 0:
                            vendors = {a.vendor for a in owned if a.vendor}
                            if len(vendors) == 1:
                                attributable.append((t, list(vendors)[0]))
                            else:
                                # Try text matching
                                search_text = f"{(t.subject or '')} {(t.description or '')}".lower()
                                for v in {a.vendor for a in assets if a.vendor}:
                                    if v.lower() in search_text:
                                        attributable.append((t, v))
                                        break

        print(f"Total Tickets: {len(tickets)}")
        print(f"Unlinked Technical Tickets: {len(unlinked_tech)}")
        print(f"Smart-Attributable Tickets: {len(attributable)}")
        
        for t, v in attributable[:10]:
            print(f"  - Ticket: '{t.subject}' -> Vendor: {v}")

if __name__ == "__main__":
    asyncio.run(check_oem_attribution())
