import asyncio
import os
import sys
from sqlalchemy.future import select
from sqlalchemy import func

# Add backend to path
sys.path.append(os.getcwd())

from backend.app.database.database import AsyncSessionLocal
from backend.app.models.models import Ticket, Department

async def check():
    async with AsyncSessionLocal() as db:
        # Check total tickets in system
        total_stmt = select(func.count(Ticket.id))
        total = (await db.execute(total_stmt)).scalar()
        
        # Check architecture tickets
        arch_dept = (await db.execute(select(Department).where(Department.name.ilike("%Architecture%")))).scalars().first()
        arch_count = 0
        if arch_dept:
            arch_stmt = select(func.count(Ticket.id)).where(Ticket.target_department_id == arch_dept.id)
            arch_count = (await db.execute(arch_stmt)).scalar()
        
        print(f"DEBUG: Total System Tickets: {total}")
        print(f"DEBUG: Total Architecture Tickets: {arch_count}")

if __name__ == "__main__":
    asyncio.run(check())
