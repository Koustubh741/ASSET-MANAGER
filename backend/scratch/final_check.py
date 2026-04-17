import asyncio
from app.database.database import AsyncSessionLocal
from sqlalchemy import text
from app.models.models import Department, AssignmentGroup

async def main():
    async with AsyncSessionLocal() as db:
        # 1. Departments Check
        res_depts = await db.execute(text("SELECT name, slug FROM auth.departments WHERE name NOT LIKE '[DEPRECATED]%' ORDER BY name"))
        depts = res_depts.all()
        print(f"--- TOTAL ACTIVE RETAIL DEPARTMENTS: {len(depts)} ---")
        for d in depts:
            print(f"DEPT: {d[0]} (slug: {d[1]})")
        
        # 2. Assignment Groups Check
        res_groups = await db.execute(text("SELECT name, department_id FROM support.assignment_groups ORDER BY name"))
        groups = res_groups.all()
        print(f"\n--- TOTAL ASSIGNMENT GROUPS: {len(groups)} ---")
        for g in groups:
            print(f"GROUP: {g[0]} -> ID: {g[1]}")
            
        # 3. Orphaned Depts Check
        res_orphans = await db.execute(text("SELECT name FROM auth.departments WHERE name LIKE '[DEPRECATED]%'"))
        orphans = res_orphans.all()
        print(f"\n--- DEPRECATED DEPARTMENTS: {len(orphans)} ---")
        for o in orphans:
            print(f"OLD: {o[0]}")

if __name__ == "__main__":
    asyncio.run(main())
