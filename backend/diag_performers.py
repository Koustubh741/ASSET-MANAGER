"""
Diagnostic: Check why Gretchen Bodinski (or any IT staff) is missing from Performers leaderboard.
Run from: d:\ASSET-MANAGER\backend\
Command: python diag_performers.py
"""
import asyncio
import os, sys
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, text
from app.models.models import User

DATABASE_URL = os.getenv("DATABASE_URL", "").replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

IT_ROLES = ["IT_SUPPORT", "SUPPORT_SPECIALIST", "IT_MANAGEMENT", "ADMIN"]

async def main():
    async with AsyncSessionLocal() as db:
        # 1. Find Gretchen specifically
        q = await db.execute(
            select(User.id, User.full_name, User.role, User.status, User.position)
            .where(User.full_name.ilike("%gretchen%"))
        )
        gretchen_rows = q.all()
        print("\n=== Gretchen Bodinski Record ===")
        if gretchen_rows:
            for r in gretchen_rows:
                print(f"  ID:       {r.id}")
                print(f"  Name:     {r.full_name}")
                print(f"  Role:     {r.role}")
                print(f"  Status:   {r.status}")
                print(f"  Position: {r.position}")
                in_roles = r.role in IT_ROLES
                not_disabled = r.status != "DISABLED"
                print(f"  >>> Role match (IT_ROLES): {in_roles}")
                print(f"  >>> Status not DISABLED:   {not_disabled}")
                print(f"  >>> WOULD APPEAR: {in_roles and not_disabled}")
        else:
            print("  NOT FOUND in DB")

        # 2. Show all IT-role users and their status
        q2 = await db.execute(
            select(User.full_name, User.role, User.status)
            .where(User.role.in_(IT_ROLES))
            .order_by(User.role, User.full_name)
        )
        all_it = q2.all()
        print(f"\n=== All Users with IT Roles ({len(all_it)} total) ===")
        for r in all_it:
            flag = "✓" if r.status != "DISABLED" else "✗ EXCLUDED"
            print(f"  [{flag}] {r.full_name} | role={r.role} | status={r.status}")

asyncio.run(main())
