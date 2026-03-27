import asyncio
import os
import sys
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# App setup
sys.path.append(os.path.abspath(os.getcwd()))
from app.models.models import Ticket, User, AssignmentGroup
from app.db.database import DATABASE_URL

async def audit():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Internal Logic
        q_int = select(Ticket.id).join(User, Ticket.requestor_id == User.id).join(AssignmentGroup, Ticket.assignment_group_id == AssignmentGroup.id).filter(User.department != None, User.department == AssignmentGroup.department)
        ids_int = set((await session.execute(q_int)).scalars().all())
        
        # External Logic
        q_ext = select(Ticket.id).outerjoin(User, Ticket.requestor_id == User.id).outerjoin(AssignmentGroup, Ticket.assignment_group_id == AssignmentGroup.id).filter(or_(User.department != AssignmentGroup.department, User.department == None, AssignmentGroup.department == None))
        ids_ext = set((await session.execute(q_ext)).scalars().all())
        
        overlap = ids_int.intersection(ids_ext)
        print(f"Internal IDs: {len(ids_int)}")
        print(f"External IDs: {len(ids_ext)}")
        print(f"Overlap: {len(overlap)}")
        if overlap:
            print(f"Overlap Sample: {list(overlap)[:5]}")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(audit())
