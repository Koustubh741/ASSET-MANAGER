
import asyncio
from sqlalchemy import text
from app.database.database import AsyncSessionLocal

async def find_fks():
    async with AsyncSessionLocal() as db:
        query = text("""
            SELECT
                tc.table_schema, 
                tc.table_name, 
                kcu.column_name 
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' 
              AND ccu.table_name = 'assets';
        """)
        res = await db.execute(query)
        for r in res.all():
            print(f"Referenced from: {r[0]}.{r[1]} (column {r[2]})")

if __name__ == "__main__":
    asyncio.run(find_fks())
