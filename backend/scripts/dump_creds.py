import asyncio
import os
import sys
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Add backend to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.models import User

DATABASE_URL = "postgresql+asyncpg://postgres:Koustubh%40123@localhost:5432/ITSM"

async def dump_credentials():
    engine = create_async_engine(DATABASE_URL)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).order_by(User.department, User.role))
        users = result.scalars().all()
        
        # We know the seeded password is 'password123' for most and 'Password@123' for others
        # I'll just list them.
        
        output_file = os.path.join(os.path.dirname(__file__), "credentials_dump.txt")
        with open(output_file, "w") as f:
            f.write(f"{'Email':<40} | {'Role':<20} | {'Department':<20} | {'Password (Seeded)'}\n")
            f.write("-" * 110 + "\n")
            for u in users:
                # Based on our seeding scripts:
                # root_fix_complete_user_seeding -> password123
                # create_missing_dept_users -> Password@123
                pwd = "password123 (or Password@123)"
                f.write(f"{u.email:<40} | {u.role:<20} | {str(u.department):<20} | {pwd}\n")
        
        print(f"Credentials dumped to {output_file}")

if __name__ == "__main__":
    asyncio.run(dump_credentials())
