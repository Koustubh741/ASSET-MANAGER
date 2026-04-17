"""
Diagnostic: Find all user accounts NOT in the v2 retail department set.
Run from: d:\ASSET-MANAGER\backend
  python scratch/check_non_retail_accounts.py
"""
import asyncio
import sys
import os
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append(os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from app.database.database import AsyncSessionLocal
from app.models.models import User, Department

# The canonical v2 retail department names
V2_RETAIL_DEPT_NAMES = {
    "ADMIN", "B&M", "BD", "F&A", "HR", "INVENTORY", "IT",
    "LEGAL & COMPANY SECRETARY", "LOSS PREVENTION", "MARKETING",
    "NSO", "PLANNING", "PROJECT", "RETAIL", "RETAIL OPERATION", "SCM"
}

async def check_non_retail_accounts():
    print("\n" + "="*65)
    print("  DIAGNOSTIC: Accounts NOT in v2 Retail Department Set")
    print("="*65)

    async with AsyncSessionLocal() as db:
        # 1. Load all departments
        dept_res = await db.execute(select(Department))
        all_depts = dept_res.scalars().all()

        retail_dept_ids = set()
        non_retail_depts = []
        for d in all_depts:
            name = (d.name or "").strip().upper()
            canonical = d.name.strip() if d.name else ""
            if canonical in V2_RETAIL_DEPT_NAMES:
                retail_dept_ids.add(d.id)
            else:
                non_retail_depts.append(d)

        print(f"\n[INFO] Total departments in DB   : {len(all_depts)}")
        print(f"[INFO] V2 Retail departments found : {len(retail_dept_ids)}")
        print(f"[INFO] Non-retail departments      : {len(non_retail_depts)}")

        if non_retail_depts:
            print("\n--- Non-Retail Departments ---")
            for d in non_retail_depts:
                print(f"  [{d.id}]  '{d.name}'  (slug: {d.slug})")

        # 2. Load all users
        user_res = await db.execute(select(User))
        all_users = user_res.scalars().all()

        # Categorize
        no_dept_users = []
        non_retail_dept_users = []

        for u in all_users:
            if u.department_id is None:
                no_dept_users.append(u)
            elif u.department_id not in retail_dept_ids:
                non_retail_dept_users.append(u)

        print(f"\n[INFO] Total user accounts         : {len(all_users)}")
        print(f"[INFO] In v2 retail departments    : {len(all_users) - len(no_dept_users) - len(non_retail_dept_users)}")
        print(f"[INFO] In NON-retail departments   : {len(non_retail_dept_users)}")
        print(f"[INFO] No department assigned (NULL): {len(no_dept_users)}")

        # 3. Print users in non-retail departments
        if non_retail_dept_users:
            print("\n" + "="*65)
            print("  ACCOUNTS IN NON-RETAIL DEPARTMENTS")
            print("="*65)
            # Build dept name lookup
            dept_name_map = {d.id: d.name for d in all_depts}
            for u in non_retail_dept_users:
                dept_name = dept_name_map.get(u.department_id, "UNKNOWN")
                print(f"  {u.email:<40} | role={u.role:<15} | dept='{dept_name}'")

        # 4. Print users with no department
        if no_dept_users:
            print("\n" + "="*65)
            print("  ACCOUNTS WITH NO DEPARTMENT (NULL)")
            print("="*65)
            for u in no_dept_users:
                print(f"  {u.email:<40} | role={u.role:<15} | status={u.status}")

        # 5. Summary
        total_non_retail = len(non_retail_dept_users) + len(no_dept_users)
        print(f"\n{'='*65}")
        print(f"  TOTAL NON-V2-RETAIL ACCOUNTS : {total_non_retail}")
        print(f"{'='*65}\n")

if __name__ == "__main__":
    asyncio.run(check_non_retail_accounts())
