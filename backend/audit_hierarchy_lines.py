import asyncio
from app.database.database import AsyncSessionLocal
from app.models.models import User
from sqlalchemy import select

async def audit_hierarchy():
    async with AsyncSessionLocal() as db:
        # Get all users and their managers
        res = await db.execute(select(User))
        users = res.scalars().all()
        id_to_user = {u.id: u for u in users}
        
        print("\n--- REPORTING LINES ---")
        for u in sorted(users, key=lambda x: x.role):
            manager = id_to_user.get(u.manager_id)
            manager_name = manager.full_name if manager else "No Manager (Top Level)"
            print(f"User: {u.full_name.ljust(25)} | Role: {u.role.ljust(15)} | Position: {u.position.ljust(15)} | Reports To: {manager_name}")

if __name__ == "__main__":
    asyncio.run(audit_hierarchy())
