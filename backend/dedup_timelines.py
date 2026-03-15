"""
Deduplicates consecutive identical timeline entries in all tickets.
Removes duplicate PROGRESS_UPDATE (or any action) entries that share
the same action + comment and are back-to-back.
"""
import asyncio
from sqlalchemy import select, update
from app.database.database import AsyncSessionLocal
from app.models.models import Ticket

def dedup_timeline(timeline):
    if not timeline:
        return timeline
    deduped = [timeline[0]]
    for event in timeline[1:]:
        last = deduped[-1]
        # Remove if same action AND same comment (exact duplicate content)
        if event.get("action") == last.get("action") and event.get("comment") == last.get("comment"):
            continue
        deduped.append(event)
    return deduped

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Ticket))
        tickets = result.scalars().all()

        fixed = 0
        for ticket in tickets:
            original = list(ticket.timeline) if ticket.timeline else []
            cleaned = dedup_timeline(original)
            if len(cleaned) != len(original):
                print(f"[FIX] Ticket {ticket.id}: {len(original)} -> {len(cleaned)} events (removed {len(original)-len(cleaned)} duplicates)")
                ticket.timeline = cleaned
                fixed += 1

        if fixed > 0:
            await db.commit()
            print(f"\n✅ Deduplication complete. Fixed {fixed} ticket(s).")
        else:
            print("✅ No duplicates found — all timelines are already clean.")

asyncio.run(main())
