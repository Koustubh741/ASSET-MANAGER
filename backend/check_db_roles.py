import asyncio
from sqlalchemy import select
from app.database.database import AsyncSessionLocal
from app.models.models import User

async def check_roles():
    async with AsyncSessionLocal() as db:
        try:
            # Get unique roles and positions
            result = await db.execute(select(User.role, User.position).distinct())
            roles_positions = result.all()
            
            print("DATABASE ROLES AND POSITIONS:")
            for r, p in roles_positions:
                print(f"Role: {r}, Position: {p}")
                
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_roles())
