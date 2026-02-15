import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

load_dotenv()

async def inspect():
    engine = create_async_engine(os.getenv("DATABASE_URL"))
    async with engine.connect() as conn:
        result = await conn.execute(text("select schema_name from information_schema.schemata;"))
        schemas = [row[0] for row in result]
        print("Schemas:", schemas)
        
        result = await conn.execute(text("select tablename, schemaname from pg_catalog.pg_tables where schemaname not in ('pg_catalog', 'information_schema');"))
        tables = [(row[0], row[1]) for row in result]
        print("Tables:", tables)
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(inspect())
