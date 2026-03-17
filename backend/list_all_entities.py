import asyncio
from app.database.database import AsyncSessionLocal
from app.models.models import User, Ticket, AssetRequest
from sqlalchemy import select, func

async def list_all():
    async with AsyncSessionLocal() as db:
        # 1. Users
        res = await db.execute(select(User))
        users = res.scalars().all()
        print(f"--- DB USERS ({len(users)}) ---")
        for u in users:
            print(f"USER: {u.full_name} | {u.email} | {u.role} | {u.department}")

        # 2. Unique Requestors from Tickets
        res_t = await db.execute(select(Ticket.requestor_name, Ticket.requestor_email).distinct())
        tickets = res_t.all()
        print(f"\n--- TICKET REQUESTORS ({len(tickets)}) ---")
        for t in tickets:
            print(f"TICKET_REQ: {t.requestor_name} | {t.requestor_email}")

        # 3. Unique Requesters from AssetRequests
        res_r = await db.execute(select(AssetRequest.requester_name).distinct())
        reqs = res_r.scalars().all()
        print(f"\n--- ASSET REQUESTERS ({len(reqs)}) ---")
        for r in reqs:
            print(f"ASSET_REQ: {r}")

if __name__ == "__main__":
    asyncio.run(list_all())
