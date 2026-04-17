"""
Purge Deprecated Departments (with Assignment Group Cascade)
=============================================================
Safely hard-deletes all [DEPRECATED] ghost departments AND their
orphaned assignment groups left over from the v2retail migration.

Safety checks:
  - No users linked to the department
  - No tickets targeting the department
  - No assets linked to the department
  - Assignment groups belonging to the dept are checked:
      - No active tickets routed to the group
      - Then deleted before the department

Run from: d:\\ASSET-MANAGER\\backend
  python scripts/purge_deprecated_depts.py
"""
import asyncio
import sys
import os
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append(os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from sqlalchemy.future import select
from sqlalchemy import func
from app.database.database import AsyncSessionLocal
from app.models.models import (
    User, Department, Ticket, Asset,
    AssignmentGroup, AssignmentGroupMember
)

GREEN  = '\033[92m'
RED    = '\033[91m'
YELLOW = '\033[93m'
BLUE   = '\033[94m'
RESET  = '\033[0m'

async def purge_deprecated_depts():
    print(f"\n{BLUE}{'='*65}")
    print("  PURGE: Deprecated (Legacy) Departments + Orphan Groups")
    print(f"{'='*65}{RESET}")

    async with AsyncSessionLocal() as db:
        # 1. Find all [DEPRECATED] departments
        result = await db.execute(
            select(Department).where(Department.name.like('[DEPRECATED]%'))
        )
        deprecated = result.scalars().all()

        if not deprecated:
            print(f"\n{GREEN}[OK] No deprecated departments found — already clean.{RESET}\n")
            return

        print(f"\n{YELLOW}[INFO] Found {len(deprecated)} deprecated departments:{RESET}")
        for d in deprecated:
            print(f"  - '{d.name}'")

        # 2. Safety-check and collect purgeable records
        safe_to_delete = []
        blocked = []

        for dept in deprecated:
            reasons = []

            # Check users
            user_count = (await db.execute(
                select(func.count()).select_from(User).where(User.department_id == dept.id)
            )).scalar()
            if user_count > 0:
                reasons.append(f"{user_count} user(s)")

            # Check tickets targeting the department directly
            ticket_count = (await db.execute(
                select(func.count()).select_from(Ticket).where(Ticket.target_department_id == dept.id)
            )).scalar()
            if ticket_count > 0:
                reasons.append(f"{ticket_count} ticket(s) targeting dept")

            # Check assets
            asset_count = (await db.execute(
                select(func.count()).select_from(Asset).where(Asset.department_id == dept.id)
            )).scalar()
            if asset_count > 0:
                reasons.append(f"{asset_count} asset(s)")

            # Check assignment groups — fetch them so we can cascade
            groups_res = await db.execute(
                select(AssignmentGroup).where(AssignmentGroup.department_id == dept.id)
            )
            groups = groups_res.scalars().all()

            blocked_groups = []
            clean_groups = []
            for g in groups:
                # Check if any tickets are still routed to this group
                grp_ticket_count = (await db.execute(
                    select(func.count()).select_from(Ticket).where(Ticket.assignment_group_id == g.id)
                )).scalar()
                if grp_ticket_count > 0:
                    blocked_groups.append((g, grp_ticket_count))
                else:
                    clean_groups.append(g)

            if blocked_groups:
                for g, cnt in blocked_groups:
                    reasons.append(f"group '{g.name}' has {cnt} ticket(s)")

            if reasons:
                blocked.append((dept, reasons))
            else:
                safe_to_delete.append((dept, clean_groups))

        # 3. Report blocked
        if blocked:
            print(f"\n{RED}[WARN] Cannot fully purge (still have live records):{RESET}")
            for dept, reasons in blocked:
                print(f"  BLOCKED: '{dept.name}' — {', '.join(reasons)}")

        # 4. Delete safe ones
        if not safe_to_delete:
            print(f"\n{YELLOW}[INFO] No departments cleared for deletion.{RESET}")
            return

        print(f"\n{GREEN}[INFO] Proceeding to purge {len(safe_to_delete)} department(s)...{RESET}")

        deleted_depts = 0
        deleted_groups = 0
        deleted_members = 0

        for dept, groups in safe_to_delete:
            print(f"\n  PROCESSING: '{dept.name}'")

            # Delete group members first
            for g in groups:
                member_res = await db.execute(
                    select(AssignmentGroupMember).where(AssignmentGroupMember.group_id == g.id)
                )
                members = member_res.scalars().all()
                for m in members:
                    await db.delete(m)
                    deleted_members += 1

                print(f"    - Deleting group: '{g.name}' ({len(members)} member(s) removed)")
                await db.delete(g)
                deleted_groups += 1

            # Now delete the department
            print(f"    - Deleting department: '{dept.name}'")
            await db.delete(dept)
            deleted_depts += 1

        await db.commit()

        print(f"\n{GREEN}{'='*65}")
        print(f"  PURGE COMPLETE")
        print(f"  Departments deleted     : {deleted_depts}")
        print(f"  Assignment groups purged: {deleted_groups}")
        print(f"  Group members removed   : {deleted_members}")
        if blocked:
            print(f"  Skipped (live records)  : {len(blocked)}")
        print(f"{'='*65}{RESET}\n")

if __name__ == "__main__":
    asyncio.run(purge_deprecated_depts())
