
import sys
import os
import asyncio
from collections import Counter

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database.database import AsyncSessionLocal
from app.models.models import Ticket
from sqlalchemy import select

async def audit_others():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Ticket.subject, Ticket.description).filter(Ticket.category == 'Other'))
        others = result.all()
        
        print(f"Total 'Other' tickets: {len(others)}")
        print("\nSample Subjects:")
        for subj, desc in others[:20]:
            print(f"- {subj}")

if __name__ == "__main__":
    asyncio.run(audit_others())
