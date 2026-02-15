"""
Reset password for endcloud@gmail.com
"""
import asyncio
from app.database.database import get_db
from app.models.models import User
from sqlalchemy.future import select
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def reset_password():
    print("=== RESETTING PASSWORD ===\n")
    
    email = "endcloud@gmail.com"
    new_password = "password123"
    
    async for db in get_db():
        result = await db.execute(
            select(User).filter(User.email == email)
        )
        user = result.scalars().first()
        
        if not user:
            print(f"[ERROR] User '{email}' not found")
            break
        
        print(f"User: {user.email}")
        print(f"  Current status: {user.status}")
        print(f"  Role: {user.role}")
        print(f"  Domain: {user.domain}")
        print()
        
        # Hash the new password
        hashed = pwd_context.hash(new_password)
        
        # Update the password (correct field name is password_hash)
        user.password_hash = hashed
        
        await db.commit()
        await db.refresh(user)
        
        print(f"[SUCCESS] Password reset to: {new_password}")
        print(f"  User can now login with:")
        print(f"    Email: {email}")
        print(f"    Password: {new_password}")
        
        break

if __name__ == "__main__":
    asyncio.run(reset_password())
