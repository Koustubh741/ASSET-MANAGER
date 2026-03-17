import asyncio
import json
from app.database.database import get_db
from app.models.models import User
from sqlalchemy.future import select

async def list_users():
    async for db in get_db():
        result = await db.execute(select(User))
        users = result.scalars().all()
        data = []
        for user in users:
            data.append({
                "email": user.email,
                "status": user.status,
                "role": user.role,
                "has_hash": bool(user.password_hash)
            })
        print(json.dumps(data, indent=2))
        break

if __name__ == "__main__":
    asyncio.run(list_users())
