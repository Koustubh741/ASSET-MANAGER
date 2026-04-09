"""
seed_support_units.py
Creates one SUPPORT role user per non-IT department that currently has no support staff.
Password for all: Support@2024  (change via admin panel after seeding)
"""
import asyncio, sys, uuid
sys.path.insert(0, '.')
sys.stdout.reconfigure(encoding='utf-8')

import bcrypt

def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# One entry per gap department
# name, email, dept_name, domain
SUPPORT_UNITS = [
    {
        "full_name":  "Architecture Support",
        "email":      "support.architecture@itsm.com",
        "department": "Architecture",
        "domain":     "Architecture",
        "position":   "STAFF_UNIT",
    },
    {
        "full_name":  "Cloud Operations Support",
        "email":      "support.cloud@itsm.com",
        "department": "Cloud Operations",
        "domain":     "Cloud Operations",
        "position":   "STAFF_UNIT",
    },
    {
        "full_name":  "Customer Success Support",
        "email":      "support.customersuccess@itsm.com",
        "department": "Customer Success",
        "domain":     "Customer Success",
        "position":   "STAFF_UNIT",
    },
    {
        "full_name":  "Data & AI Support",
        "email":      "support.dataai@itsm.com",
        "department": "Data & AI",
        "domain":     "Data & AI",
        "position":   "STAFF_UNIT",
    },
    {
        "full_name":  "Executive Management Support",
        "email":      "support.executive@itsm.com",
        "department": "Executive Management",
        "domain":     "Executive Management",
        "position":   "STAFF_UNIT",
    },
    {
        "full_name":  "Human Resources Support",
        "email":      "support.hr@itsm.com",
        "department": "Human Resources",
        "domain":     "Human Resources",
        "position":   "STAFF_UNIT",
    },
    {
        "full_name":  "Legal & Compliance Support",
        "email":      "support.legal@itsm.com",
        "department": "Legal & Compliance",
        "domain":     "Legal & Compliance",
        "position":   "STAFF_UNIT",
    },
    {
        "full_name":  "Procurement Support",
        "email":      "support.procurement@itsm.com",
        "department": "Procurement",
        "domain":     "Procurement",
        "position":   "STAFF_UNIT",
    },
    {
        "full_name":  "Product Management Support",
        "email":      "support.product@itsm.com",
        "department": "Product Management",
        "domain":     "Product Management",
        "position":   "STAFF_UNIT",
    },
    {
        "full_name":  "Sales & Marketing Support",
        "email":      "support.sales@itsm.com",
        "department": "Sales & Marketing",
        "domain":     "Sales & Marketing",
        "position":   "STAFF_UNIT",
    },
]

PASSWORD = "Support@2024"

async def seed():
    from app.database.database import AsyncSessionLocal
    from app.models.models import User
    from sqlalchemy.future import select
    from sqlalchemy import func

    password_hash = hash_pw(PASSWORD)

    async with AsyncSessionLocal() as db:
        created = []
        skipped = []

        for entry in SUPPORT_UNITS:
            # Check if email already exists
            existing = await db.execute(
                select(User).where(func.lower(User.email) == entry["email"].lower())
            )
            if existing.scalar_one_or_none():
                skipped.append(entry["email"])
                continue

            new_user = User(
                id=uuid.uuid4(),
                email=entry["email"],
                full_name=entry["full_name"],
                password_hash=password_hash,
                role="SUPPORT",
                status="ACTIVE",
                position=entry["position"],
                department=entry["department"],
                domain=entry["domain"],
                company="ITSM Corp",
                persona="SUPPORT_AGENT",
            )
            db.add(new_user)
            created.append(entry)

        await db.commit()

        print("=" * 80)
        print("SUPPORT UNIT SEEDING COMPLETE")
        print("=" * 80)
        print(f"\nCreated : {len(created)}")
        print(f"Skipped : {len(skipped)} (already existed)")
        print(f"Password: {PASSWORD}  <-- change via admin panel")
        print()
        print(f"{'Department':<32} {'Email':<40} Status")
        print("-" * 80)
        for e in created:
            print(f"{e['department']:<32} {e['email']:<40} CREATED")
        for e in skipped:
            print(f"{'(already exists)':<32} {e:<40} SKIPPED")
        print()

        # Final verification
        vr = await db.execute(
            select(User).where(User.role == "SUPPORT").order_by(User.department)
        )
        all_support = vr.scalars().all()
        print(f"Total SUPPORT users now in DB: {len(all_support)}")
        for u in all_support:
            print(f"  {(u.department or 'NONE'):<32} {u.email}")

asyncio.run(seed())
