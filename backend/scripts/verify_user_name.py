import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models.models import User
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

async def check_user_name():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        result = await session.execute(select(User).filter(User.email == 'employee@itsm.com'))
        user = result.scalars().first()
        if user:
            print(f"Email: {user.email}")
            print(f"Full Name: {user.full_name}")
            print(f"Department: {user.department}")
        else:
            print("User employee@itsm.com not found.")
            
        print("\nSearching for 'Rachel' or 'Jane'...")
        result_all = await session.execute(select(User).filter(User.full_name.ilike('%Rachel%') | User.full_name.ilike('%Jane%')))
        matches = result_all.scalars().all()
        for m in matches:
            print(f"Match: {m.full_name} ({m.email})")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_user_name())
