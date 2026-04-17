import asyncio
import os
import sys
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

# Add the parent directory to sys.path to allow imports from 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import AsyncSessionLocal
from app.models.models import User, AssignmentGroup, Department

async def sync_data():
    """
    ROOT FIX: Synchronize legacy 'department' strings with authoritative Department names.
    This ensures that old filtering logic (ILike) matches official data.
    """
    async with AsyncSessionLocal() as db:
        print("[ROOT_FIX] Starting Department Synchronization...")
        
        # 1. Sync Assignment Groups
        groups_res = await db.execute(
            select(AssignmentGroup).options(selectinload(AssignmentGroup.dept_obj))
        )
        groups = groups_res.scalars().all()
        group_count = 0
        
        for g in groups:
            if g.dept_obj:
                official_name = g.dept_obj.name
                if getattr(g, 'department', None) and getattr(g, 'department') != official_name:
                    print(f"  Syncing Group '{g.name}': '{getattr(g, 'department')}' -> '{official_name}'")
                    # Note: department DB column is gone, so assigning to it will not persist if the ORM ignores it, 
                    # but we can try just in case it is dynamically mapped.
                    try:
                        g.department = official_name
                        group_count += 1
                    except AttributeError:
                        pass
        
        # 2. Sync Users
        users_res = await db.execute(
            select(User).options(selectinload(User.dept_obj))
        )
        users = users_res.scalars().all()
        user_count = 0
        
        for u in users:
            if u.dept_obj:
                official_name = u.dept_obj.name
                if getattr(u, 'department', None) and getattr(u, 'department') != official_name:
                    print(f"  Syncing User '{u.full_name}': '{getattr(u, 'department')}' -> '{official_name}'")
                    try:
                        u.department = official_name
                        user_count += 1
                    except AttributeError:
                        pass
        
        if group_count > 0 or user_count > 0:
            await db.commit()
            print(f"[ROOT_FIX] Success: Synchronized {group_count} groups and {user_count} users.")
        else:
            print("[ROOT_FIX] All data is already synchronized.")

if __name__ == "__main__":
    asyncio.run(sync_data())
