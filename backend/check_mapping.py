import asyncio
from app.database.database import AsyncSessionLocal
from app.models.models import User
from sqlalchemy import select

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User.department, User.domain))
        data = res.all()
        mapping = {}
        for dept, dom in data:
            if dept not in mapping: mapping[dept] = set()
            if dom: mapping[dept].add(dom)
        
        print("\n=== Department to Domain Mapping ===")
        for dept, domains in mapping.items():
            print(f"Department: {dept}")
            for dom in domains:
                print(f"  - Domain: {dom}")
        print("===================================\n")

if __name__ == "__main__":
    asyncio.run(check())
