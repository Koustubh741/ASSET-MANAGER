import asyncio
from app.db.session import async_session_factory
from sqlalchemy.future import select
from app.models.models import User

async def find_support():
    async with async_session_factory() as db:
        res = await db.execute(select(User.email, User.role, User.department).where(User.role == 'SUPPORT').limit(5))
        users = res.all()
        for u in users:
            print(f"Email: {u.email}, Role: {u.role}, Dept: {u.department}")

if __name__ == "__main__":
    asyncio.run(find_support())
