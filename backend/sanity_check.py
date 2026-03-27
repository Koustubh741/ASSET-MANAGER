import asyncio
import os
import sys
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# App setup
sys.path.append(os.path.abspath(os.getcwd()))
from app.models.models import Ticket, User, AssignmentGroup
from app.database.database import DATABASE_URL

async def audit():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Get all tickets with their depts
        q = select(Ticket.id, User.department.label("user_dept"), AssignmentGroup.department.label("group_dept")).outerjoin(User, Ticket.requestor_id == User.id).outerjoin(AssignmentGroup, Ticket.assignment_group_id == AssignmentGroup.id)
        rows = (await session.execute(q)).all()
        
        print(f"Total rows retrieved: {len(rows)}")
        ids = [str(r[0]) for r in rows]
        if len(ids) != len(set(ids)):
            print(f"ALARM: Duplicate IDs in result set! Total: {len(ids)}, Unique: {len(set(ids))}")
            # Find the culprits
            seen = set()
            for r in rows:
                if str(r[0]) in seen:
                    print(f"Duplicate ID: {r[0]}")
                seen.add(str(r[0]))

        internal_ids = []
        external_ids = []
        
        for r in rows:
            tid, u_dept, g_dept = r
            # Logic: is_internal
            is_int = (u_dept is not None and g_dept is not None and u_dept == g_dept)
            # Logic: is_external
            is_ext = (u_dept != g_dept or u_dept is None or g_dept is None)
            
            if is_int: internal_ids.append(tid)
            if is_ext: external_ids.append(tid)
            
            if is_int and is_ext:
                print(f"LOGICAL ERROR: Ticket {tid} is BOTH! UserDept={repr(u_dept)}, GroupDept={repr(g_dept)}")
        
        print(f"Summary: Internal={len(internal_ids)}, External={len(external_ids)}, Total={len(rows)}")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(audit())
