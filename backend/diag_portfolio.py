"""
Diagnostic: Check Gretchen's full record for portfolio-crashing NULL values.
"""
import asyncio
import os, sys
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models.models import User

DATABASE_URL = os.getenv("DATABASE_URL", "").replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def main():
    async with AsyncSessionLocal() as db:
        q = await db.execute(
            select(User)
            .where(User.full_name.ilike("%gretchen%"))
        )
        users = q.scalars().all()
        for u in users:
            print(f"\n--- User: {u.full_name} ({u.role}) ---")
            print(f"  ID:          {u.id}")
            print(f"  Email:       {u.email}")
            print(f"  Created At:  {u.created_at}")
            print(f"  Department:  {u.department}")
            print(f"  Persona:     {u.persona}")
            
            # Simulate the crash-prone logic
            try:
                if u.created_at:
                    date_iso = u.created_at.date().isoformat()
                    print(f"  Join Date:   {date_iso}")
                else:
                    print("  Join Date:   NULL (CRASH RISK)")
                
                role_disp = (u.role or "IT_SUPPORT").replace("_", " ").title()
                print(f"  Role Disp:   {role_disp}")
                
            except Exception as e:
                print(f"  ERROR simulating logic: {e}")

asyncio.run(main())
