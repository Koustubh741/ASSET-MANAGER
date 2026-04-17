import asyncio
import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

from app.database.database import AsyncSessionLocal
from sqlalchemy import text
from app.models.models import Department, User, Ticket

async def audit():
    async with AsyncSessionLocal() as db:
        # Get all departments
        res = await db.execute(text("SELECT id, name FROM auth.departments ORDER BY name"))
        depts = res.all()
        
        print(f"Total Departments: {len(depts)}")
        print("\n--- ALL DEPARTMENTS ---")
        for d in depts:
            print(f"{d.name}")
        
        deprecated = [d for d in depts if "[DEPRECATED]" in d.name]
        print(f"\n--- DEPRECATED DEPARTMENTS ({len(deprecated)}) ---")
        # ... logic for counts ...

        # CHECK ASSIGNMENT GROUPS
        res_g = await db.execute(text("SELECT name, department_name FROM auth.assignment_groups"))
        groups = res_g.all()
        dep_groups = [g for g in groups if g.department_name and "[DEPRECATED]" in g.department_name]
        print(f"\n--- DEPRECATED ASSIGNMENT GROUPS ({len(dep_groups)}) ---")
        for g in dep_groups:
            print(f"Group: {g.name} | Dept: {g.department_name}")

        # Check for any variation of 'Account'
        acc = [d for d in depts if "account" in d.name.lower()]
        print(f"\n--- ACCOUNT RELATED DEPARTMENTS ({len(acc)}) ---")
        for d in acc:
            print(f"ID: {d.id} | Name: {d.name}")

if __name__ == "__main__":
    asyncio.run(audit())
