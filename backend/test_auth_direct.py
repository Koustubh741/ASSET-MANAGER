
import asyncio
import os
import sys
import bcrypt

sys.path.append(os.getcwd())

from app.services.user_service import verify_password, get_password_hash
from app.database.database import AsyncSessionLocal
from app.models.models import User
from sqlalchemy import select

async def test_auth():
    async with AsyncSessionLocal() as db:
        email = 'employee@itsm.com'
        result = await db.execute(select(User).filter(User.email == email))
        user = result.scalars().first()
        
        if not user:
            print(f"User {email} not found")
            return

        print(f"User: {user.email}")
        print(f"Status: {user.status}")
        print(f"Stored Hash: {user.password_hash}")
        
        password = "password123"
        match = verify_password(password, user.password_hash)
        print(f"Password 'password123' matches stored hash: {match}")
        
        # Test manual verification
        try:
            manual_match = bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8'))
            print(f"Manual bcrypt checkpw match: {manual_match}")
        except Exception as e:
            print(f"Manual bcrypt checkpw failed: {e}")

        # Try to regenerate hash and check
        new_hash = get_password_hash(password)
        print(f"New Hash for 'password123': {new_hash}")
        new_match = verify_password(password, new_hash)
        print(f"Password 'password123' matches new hash: {new_match}")

if __name__ == "__main__":
    asyncio.run(test_auth())
