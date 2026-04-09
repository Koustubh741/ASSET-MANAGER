import asyncio
import os
import sys

# Add current directory to path
sys.path.append(os.getcwd())

from app.database.database import AsyncSessionLocal
from app.models.models import User
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).options(joinedload(User.dept_obj)).filter(User.email == 'eng_mgr@enterprise.com'))
        u = res.scalars().first()
        if u:
            print(f'Manager: {u.email}, Dept: {u.dept_obj.name if u.dept_obj else "None"}')
        else:
            print('Manager eng_mgr@enterprise.com not found')

        res2 = await db.execute(select(User).options(joinedload(User.dept_obj)).filter(User.email == 'dev1@enterprise.com'))
        u2 = res2.scalars().first()
        if u2:
            print(f'Requester: {u2.email}, Dept: {u2.dept_obj.name if u2.dept_obj else "None"}')
        else:
            print('Requester dev1@enterprise.com not found')

if __name__ == "__main__":
    asyncio.run(check())
