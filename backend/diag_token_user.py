import asyncio
from sqlalchemy import text
from app.database.database import get_db

async def check_user_by_id(user_id):
    async for db in get_db():
        result = await db.execute(text("SELECT * FROM auth.users WHERE id = :user_id"), {"user_id": user_id})
        row = result.fetchone()
        if row:
            print(f"User found for ID {user_id}:")
            for key in row._mapping.keys():
                print(f"  {key}: {row._mapping[key]}")
        else:
            print(f"No user found for ID {user_id}")
        break

if __name__ == "__main__":
    # ID from the user's token
    target_id = "7c37b28c-3b0c-41c5-8211-6343e973a7ef"
    asyncio.run(check_user_by_id(target_id))
