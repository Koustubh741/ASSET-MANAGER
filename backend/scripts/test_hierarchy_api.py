import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import AsyncSessionLocal
from app.services.department_service import department_service
import json

async def test_api():
    async with AsyncSessionLocal() as db:
        nodes = await department_service.get_department_hierarchy(db)
        print("Successfully built hierarchy with", len(nodes), "Root Nodes.")
        
        # Test serialization of a random node to prove dictionaries are correct
        if nodes:
            print(json.dumps(nodes[0], indent=2))

if __name__ == "__main__":
    asyncio.run(test_api())
