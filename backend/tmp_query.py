import asyncio
from sqlalchemy import select, func
from app.database.database import async_engine, AsyncSessionLocal
from app.models.models import User, Ticket

async def main():
    async with AsyncSessionLocal() as db:
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

asyncio.run(main())
