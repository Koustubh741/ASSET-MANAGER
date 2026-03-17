import asyncio
from app.database.database import AsyncSessionLocal
from app.models.models import Asset
from sqlalchemy import select
from collections import Counter

async def main():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Asset))
        assets = res.scalars().all()
        
        print("\n--- Check duplicate names ---")
        names = [a.name for a in assets]
        dupe_names = [k for k, v in Counter(names).items() if v > 1 and k]
        for name in dupe_names:
            print(f"Duplicate name: {name}")
            for a in assets:
                if a.name == name:
                    print(f"  - Asset ID: {a.id}, Specs: {a.specifications}")
                    
        print("\n--- Check Agent IDs in specifications ---")
        agent_ids = []
        for a in assets:
            if a.specifications and "Agent ID" in a.specifications:
                agent_ids.append(a.specifications["Agent ID"])
        dupe_agent_ids = [k for k, v in Counter(agent_ids).items() if v > 1 and k]
        for aid in dupe_agent_ids:
            # exclude the zeroes because we already filtered them
            if aid == "00000000-0000-0000-0000-000000000000": continue
            print(f"Duplicate Agent ID value: {aid}")
            for a in assets:
                if a.specifications and a.specifications.get("Agent ID") == aid:
                    print(f"  - Asset ID: {a.id}, Name: {a.name}")
                    
        print("Done")

if __name__ == "__main__":
    asyncio.run(main())
