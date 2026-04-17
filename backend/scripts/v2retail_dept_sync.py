import asyncio
import os
import sys
import uuid
from sqlalchemy import text
from sqlalchemy.future import select

# Add backend and root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import AsyncSessionLocal
from app.models.models import Department, AssignmentGroup, User, AssignmentGroupMember

RETAIL_DEPTS = [
    {"name": "ADMIN", "slug": "admin", "desc": "General administration and facility support."},
    {"name": "B&M", "slug": "bandm", "desc": "Buying & Merchandising - Product selection and planning."},
    {"name": "BD", "slug": "bd", "desc": "Business Development - Partnerships and growth."},
    {"name": "F&A", "slug": "fanda", "desc": "Finance & Accounts - Invoicing and auditing."},
    {"name": "HR", "slug": "hr", "desc": "Human Resources - Recruitment and employee relations."},
    {"name": "INVENTORY", "slug": "inventory", "desc": "Warehouse management and stock tracking."},
    {"name": "IT", "slug": "it", "desc": "Information Technology and retail systems support."},
    {"name": "LEGAL & COMPANY SECRETARY", "slug": "legal", "desc": "Compliance and corporate governance."},
    {"name": "LOSS PREVENTION", "slug": "lossprev", "desc": "Security and shrinkage management."},
    {"name": "MARKETING", "slug": "marketing", "desc": "Branding and campaigns."},
    {"name": "NSO", "slug": "nso", "desc": "New Store Opening planning and execution."},
    {"name": "PLANNING", "slug": "planning", "desc": "Strategic organizational planning."},
    {"name": "PROJECT", "slug": "project", "desc": "Infrastructure builds and special initiatives."},
    {"name": "RETAIL", "slug": "retail", "desc": "Core store operations management."},
    {"name": "RETAIL OPERATION", "slug": "retailops", "desc": "Back-end operational support for store networks."},
    {"name": "SCM", "slug": "scm", "desc": "Supply Chain Management - Logistics and distribution."}
]

async def sync_retail_depts():
    print("=== STARTING V2 RETAIL DEPARTMENT SYNC (HARDENED) ===")
    async with AsyncSessionLocal() as db:
        try:
            # 1. Clear Slug Namespace
            print("CLEARING SLUG NAMESPACE...")
            curr_depts_res = await db.execute(select(Department))
            curr_depts = curr_depts_res.scalars().all()
            for d in curr_depts:
                # Give every existing dept a temporary unique slug to free up 'it', 'legal', etc.
                d.slug = f"tmp_{uuid.uuid4().hex[:8]}"
            await db.flush()

            # 2. Get fallback manager (first admin found)
            admin_res = await db.execute(select(User).filter(User.role == 'ADMIN').limit(1))
            admin_user = admin_res.scalar_one_or_none()
            if not admin_user:
                print("WARNING: No ADMIN user found to assign as default manager.")
            
            admin_id = admin_user.id if admin_user else None

            # 3. Create Map of existing depts by EXACT name
            curr_names = {d.name: d for d in curr_depts}

            # 4. Upsert Retail Depts
            print("UPSERTING RETAIL DEPARTMENTS...")
            new_dept_ids = []
            it_dept_id = None

            for d_info in RETAIL_DEPTS:
                name = d_info["name"]
                if name in curr_names:
                    dept = curr_names[name]
                    dept.slug = d_info["slug"]
                    dept.description = d_info["desc"]
                    print(f"  UPDATING: {name}")
                else:
                    dept = Department(
                        name=name,
                        slug=d_info["slug"],
                        description=d_info["desc"],
                        manager_id=admin_id
                    )
                    db.add(dept)
                    print(f"  CREATING: {name}")
                
                await db.flush() 
                new_dept_ids.append(dept.id)
                if name == "IT":
                    it_dept_id = dept.id

                # 5. Ensure Default Assignment Group for this Dept
                group_name = f"{name} Support Group"
                group_res = await db.execute(select(AssignmentGroup).filter(AssignmentGroup.name == group_name))
                group = group_res.scalar_one_or_none()
                if not group:
                    group = AssignmentGroup(
                        name=group_name,
                        department_id=dept.id,
                        description=f"Primary support group for {name}",
                        manager_id=admin_id
                    )
                    db.add(group)
                    print(f"    + GROUP: {group_name}")
                    await db.flush()
                
                if admin_id:
                    member_res = await db.execute(select(AssignmentGroupMember).filter(
                        AssignmentGroupMember.group_id == group.id,
                        AssignmentGroupMember.user_id == admin_id
                    ))
                    if not member_res.scalar_one_or_none():
                        db.add(AssignmentGroupMember(group_id=group.id, user_id=admin_id))

            # 6. Cleanup / Reassign Orphaned Entities
            print("CLEANING UP LEGACY DEPARTMENTS...")
            retail_names = [d["name"] for d in RETAIL_DEPTS]
            
            for d in curr_depts:
                if d.name not in retail_names:
                    print(f"  DEACTIVATING: {d.name}")
                    # Reassign users
                    await db.execute(
                        text("UPDATE auth.users SET department_id = :it_id WHERE department_id = :old_id"),
                        {"it_id": it_dept_id, "old_id": d.id}
                    )
                    # Reassign tickets
                    await db.execute(
                        text("UPDATE support.tickets SET target_department_id = :it_id WHERE target_department_id = :old_id"),
                        {"it_id": it_dept_id, "old_id": d.id}
                    )
                    # Rename and ensure slug doesn't conflict
                    d.name = f"[DEPRECATED] {d.name}"
                    # d.slug already has a tmp value from step 1

            await db.commit()
            print("=== SYNC COMPLETE ===")

        except Exception as e:
            await db.rollback()
            print(f"FATAL ERROR DURING SYNC: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(sync_retail_depts())
