"""
Check user credentials and status for endcloud@gmail.com
"""
import asyncio
from app.database.database import get_db
from app.models.models import User
from sqlalchemy.future import select

async def check_user():
    print("=== USER CREDENTIAL CHECK ===\n")
    
    async for db in get_db():
        result = await db.execute(
            select(User).filter(User.email == 'endcloud@gmail.com')
        )
        user = result.scalars().first()
        
        if not user:
            print("[ERROR] User 'endcloud@gmail.com' NOT FOUND in database")
            print("\nPossible causes:")
            print("  1. User was never created")
            print("  2. Email was misspelled during creation")
            print("\nSearching for similar emails...")
            
            result = await db.execute(
                select(User).filter(User.email.like('%endcloud%'))
            )
            similar = result.scalars().all()
            
            if similar:
                print("\nSimilar users found:")
                for u in similar:
                    print(f"  - {u.email}")
            else:
                print("  No similar users found")
        else:
            print(f"User: {user.email}")
            print(f"  ID: {user.id}")
            print(f"  Role: {user.role}")
            print(f"  Position: {user.position}")
            print(f"  Domain: {user.domain}")
            print(f"  Status: {user.status}")
            print(f"  Full Name: {user.full_name}")
            print(f"  Has Password Hash: {'Yes' if user.password_hash else 'No'}")
            
            if user.status != 'ACTIVE':
                print(f"\n[WARNING] User status is '{user.status}', not 'ACTIVE'")
                print("  This will prevent login even with correct credentials")
            
            if not user.password_hash:
                print("\n[ERROR] User has no password set!")
                print("  This user cannot log in")
        
        break

if __name__ == "__main__":
    asyncio.run(check_user())
