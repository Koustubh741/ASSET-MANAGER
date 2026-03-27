import asyncio
import os
import sys
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# Add app base to path
sys.path.append(os.path.abspath(os.path.join(os.getcwd(), '..')))

from app.models.models import Ticket, User, AssignmentGroup
from app.db.database import DATABASE_URL

async def audit_split():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # 1. Check Total
        res_total = await session.execute(select(func.count(Ticket.id)))
        total = res_total.scalar()
        
        # 2. Check Internal (Logic: Dept Match and NOT NULL)
        res_int = await session.execute(
            select(func.count(Ticket.id))
            .join(User, Ticket.requestor_id == User.id)
            .join(AssignmentGroup, Ticket.assignment_group_id == AssignmentGroup.id)
            .filter(User.department != None, User.department == AssignmentGroup.department)
        )
        internal = res_int.scalar()
        
        # 3. Check External (Logic: Dept Mismatch OR NULLs)
        res_ext = await session.execute(
            select(func.count(Ticket.id))
            .outerjoin(User, Ticket.requestor_id == User.id)
            .outerjoin(AssignmentGroup, Ticket.assignment_group_id == AssignmentGroup.id)
            .filter(or_(User.department != AssignmentGroup.department, User.department == None, AssignmentGroup.department == None))
        )
        external = res_ext.scalar()
        
        print(f"--- ITSM INTEGRATION AUDIT ---")
        print(f"Total Tickets: {total}")
        print(f"Internal (Team): {internal}")
        print(f"External (Support): {external}")
        print(f"Consistency Check: {internal + external == total}")
        
        if internal + external != total:
            # Check for orphans
            res_orphans = await session.execute(
                select(Ticket.id, User.department, AssignmentGroup.department)
                .outerjoin(User, Ticket.requestor_id == User.id)
                .outerjoin(AssignmentGroup, Ticket.assignment_group_id == AssignmentGroup.id)
                .limit(5)
            )
            print("Sample Data:")
            for r in res_orphans.all():
                print(f"Ticket {r[0]}: ReqDept={r[1]}, GroupDept={r[2]}")
                
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(audit_split())
