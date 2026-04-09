
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:Koustubh%40123@127.0.0.1:5432/ITSM"

async def check():
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        print("Checking all schemas for 'notifications' table...")
        res = await conn.execute(text("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'notifications'"))
        tabs = [f"{r[0]}.{r[1]}" for r in res.all()]
        print(f"Tables found: {tabs}")
        
        for t in tabs:
            schema, name = t.split('.')
            print(f"\nColumns for {t}:")
            res = await conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_schema = '{schema}' AND table_name = '{name}'"))
            cols = [r[0] for r in res.all()]
            print(cols)

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check())
