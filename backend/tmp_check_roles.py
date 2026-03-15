import asyncio
from sqlalchemy import select, func
from app.database.database import async_engine, AsyncSessionLocal
from app.models.models import User, Ticket

async def main():
    async with AsyncSessionLocal() as db:
        print("--- ALL USERS WITH RESOLVED TICKETS ---")
        query = select(
            User.full_name,
            User.role,
            User.position,
            func.count(Ticket.id)
        ).join(User, Ticket.assigned_to_id == User.id)\
         .filter(Ticket.status == "RESOLVED")\
         .group_by(User.full_name, User.role, User.position)
        
        result = await db.execute(query)
        rows = result.all()
        for r in rows:
            print(f"{r[0]} | Role: {r[1]} | Pos: {r[2]} | Count: {r[3]}")

        print("\n--- ALL USERS WITH ROLE IT_SUPPORT or SUPPORT_SPECIALIST ---")
        query2 = select(User.full_name, User.role, User.position).filter(User.role.in_(["IT_SUPPORT", "SUPPORT_SPECIALIST"]))
        result2 = await db.execute(query2)
        rows2 = result2.all()
        for r in rows2:
            print(f"{r[0]} | Role: {r[1]} | Pos: {r[2]}")

asyncio.run(main())
