import asyncio, sys
sys.path.insert(0, '.')

async def sync():
    from app.database.database import AsyncSessionLocal
    from app.models.models import User, Department
    from sqlalchemy.future import select
    from sqlalchemy import update

    async with AsyncSessionLocal() as db:
        # Get map of name -> id
        dr = await db.execute(select(Department))
        dept_map = {d.name: d.id for d in dr.scalars().all()}
        
        # Get all users with a department string but NO department_id
        ur = await db.execute(select(User).where(User.department.isnot(None), User.department_id.is_(None)))
        users = ur.scalars().all()
        
        print(f"Checking {len(users)} users for department_id sync...")
        count = 0
        for u in users:
            d_id = dept_map.get(u.department)
            if d_id:
                u.department_id = d_id
                count += 1
                print(f"  Synced: {u.email} -> {u.department} (ID: {d_id})")
        
        await db.commit()
        print(f"\nSuccessfully synced {count} users.")

asyncio.run(sync())
