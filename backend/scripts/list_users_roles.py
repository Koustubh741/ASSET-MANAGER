import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from app.models.models import User
import os

DATABASE_URL = "postgresql+asyncpg://postgres:Koustubh%40123@localhost:5432/ITSM"

async def list_users():
    engine = create_async_engine(DATABASE_URL)
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).order_by(User.role))
        users = result.scalars().all()
        print(f"{'Email':<35} | {'Role':<15} | {'Dept':<15} | {'Pos':<10} | {'Status':<10}")
        print("-" * 100)
        for u in users:
            print(f"{u.email:<35} | {u.role:<15} | {str(u.department):<15} | {str(u.position):<10} | {u.status:<10}")

if __name__ == "__main__":
    asyncio.run(list_users())
