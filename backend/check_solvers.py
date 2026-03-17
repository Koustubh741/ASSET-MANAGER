import asyncio
from app.database.database import AsyncSessionLocal
from app.models.models import User, Ticket
from sqlalchemy import select, func

async def get_solvers():
    async with AsyncSessionLocal() as db:
        # Join User and Ticket on assigned_to_id
        # Filter for RESOLVED status
        stmt = (
            select(User.full_name, User.role, func.count(Ticket.id).label("solved_count"))
            .join(Ticket, User.id == Ticket.assigned_to_id)
            .where(Ticket.status.in_(["RESOLVED", "Closed"]))
            .group_by(User.full_name, User.role)
            .order_by(func.count(Ticket.id).desc())
        )
        
        result = await db.execute(stmt)
        solvers = result.all()
        
        print("\n--- TICKET SOLVERS (REAL DATA) ---")
        if not solvers:
            print("No tickets have been resolved yet by assigned staff.")
        else:
            for s in solvers:
                print(f"Name: {s.full_name} | Role: {s.role} | Resolved: {s.solved_count}")

if __name__ == "__main__":
    asyncio.run(get_solvers())
