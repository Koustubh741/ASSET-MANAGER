import asyncio
from app.database.database import AsyncSessionLocal
from app.models.models import User
from app.services.user_service import get_password_hash
from sqlalchemy.future import select

async def root_fix_passwords():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User))
        users = result.scalars().all()
        
        valid_hash = get_password_hash("password123")
        
        count = 0
        for u in users:
            u.password_hash = valid_hash
            count += 1
            
        await session.commit()
        print(f"Successfully re-hashed passwords for {count} users.")

if __name__ == "__main__":
    asyncio.run(root_fix_passwords())
