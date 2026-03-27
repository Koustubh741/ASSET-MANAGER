
import sys
import os
import asyncio

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), "backend"))

from app.database.database import AsyncSessionLocal
from app.models.models import Ticket
from app.utils.category_utils import normalize_category
from sqlalchemy import select

async def migrate_categories():
    print("Starting Intelligent Ticket Category Migration (v2)...")
    async with AsyncSessionLocal() as db:
        try:
            # 1. Fetch all tickets
            result = await db.execute(select(Ticket))
            tickets = result.scalars().all()
            
            count = 0
            mapping_stats = {}
            
            for ticket in tickets:
                old_cat = ticket.category or "None"
                # Passing subject and description for intelligent mapping
                new_cat = normalize_category(ticket.category, ticket.subject, ticket.description)
                
                if old_cat != new_cat:
                    ticket.category = new_cat
                    count += 1
                    stat_key = f"'{old_cat}' -> '{new_cat}'"
                    mapping_stats[stat_key] = mapping_stats.get(stat_key, 0) + 1
            
            if count > 0:
                await db.commit()
                print(f"Successfully migrated {count} tickets.")
                print("\nMigration Breakdown:")
                for mapping, m_count in mapping_stats.items():
                    print(f"  - {mapping}: {m_count} tickets")
            else:
                print("No tickets required migration. All categories are already normalized.")
                
        except Exception as e:
            print(f"Error during migration: {e}")
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(migrate_categories())
