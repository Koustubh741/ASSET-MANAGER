
import asyncio
import os
import sys

sys.path.append(os.getcwd())

from app.database.database import AsyncSessionLocal
from app.models.models import User
from sqlalchemy import select

async def check_user():
    async with AsyncSessionLocal() as db:
        emails = ['employee@itsm.com', 'dev1@enterprise.com', 'endcloud@gmail.com']
        for email in emails:
            result = await db.execute(select(User).filter(User.email == email))
            user = result.scalars().first()
            if user:
                print(f"User: {user.email}, Status: {user.status}, Hash: {user.password_hash}")
            else:
                print(f"User {email} not found")

if __name__ == "__main__":
    asyncio.run(check_user())
