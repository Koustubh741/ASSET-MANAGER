import asyncio
import os
import sys
# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database.database import AsyncSessionLocal
from app.models.models import User
from app.utils import auth_utils
from sqlalchemy import select

async def get_token():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(User.email == 'admin@itsm.com'))
        u = res.scalars().first()
        if not u:
            print("ADMIN NOT FOUND")
            return
        
        token_data = {"sub": u.email, "user_id": str(u.id), "role": u.role}
        token = auth_utils.create_access_token(token_data)
        print(token)

if __name__ == "__main__":
    asyncio.run(get_token())
