"""
Root Fix: Orphan User Department Assignment
"""
import asyncio
import sys
import io
import os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append(os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from sqlalchemy.future import select
from app.database.database import AsyncSessionLocal
from app.models.models import User, Department

async def fix_orphan_users():
    print("\n" + "="*55)
    print("  ROOT FIX: Orphan User Department Assignment")
    print("="*55)

    async with AsyncSessionLocal() as db:
        # 1. Get orphan users
        result = await db.execute(
            select(User).where(User.department_id.is_(None))
        )
        orphans = result.scalars().all()
        print(f"\n[INFO] Found {len(orphans)} users with NULL department_id")

        if not orphans:
            print("[OK] No orphan users — platform is clean.")
            return

        # 2. Print the orphan users for visibility
        for u in orphans:
            print(f"  -> {u.email} | role={u.role} | company_id={u.company_id}")

        # 3. Find the best fallback department per user:
        #    - If user has a company_id, try to find a dept in the same company
        #    - Otherwise fall back to the first available department globally
        all_depts_result = await db.execute(select(Department))
        all_depts = all_depts_result.scalars().all()

        if not all_depts:
            print("[FAIL] No departments found in database — cannot assign.")
            return

        # Build a company -> [depts] lookup
        company_depts: dict = {}
        for d in all_depts:
            cid = str(d.company_id) if d.company_id else "__global__"
            company_depts.setdefault(cid, []).append(d)

        global_fallback = all_depts[0]

        fixed = 0
        for user in orphans:
            cid = str(user.company_id) if user.company_id else "__global__"
            candidates = company_depts.get(cid) or company_depts.get("__global__") or [global_fallback]

            # Prefer a dept named "IT" or "Technology" for system users
            preferred = next(
                (d for d in candidates if any(k in (d.name or "").lower() for k in ["it", "tech", "general", "operations"])),
                candidates[0]
            )

            user.department_id = preferred.id
            fixed += 1
            print(f"  [FIX] {user.email}  ->  dept: '{preferred.name}' ({preferred.id})")

        await db.commit()
        print(f"\n[OK] Fixed {fixed} orphan users.")
        print("="*55 + "\n")

if __name__ == "__main__":
    asyncio.run(fix_orphan_users())
