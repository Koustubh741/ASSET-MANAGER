import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv('d:/ASSET-MANAGER/backend/.env')
DATABASE_URL = os.getenv('DATABASE_URL')

async def list_all_categories():
    if not DATABASE_URL:
        print("DATABASE_URL not found")
        return

    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT name, icon_name, color FROM support.category_configs ORDER BY name"))
        rows = result.fetchall()
        print("NAME|ICON|COLOR")
        for row in rows:
            print(f"{row[0]}|{row[1]}|{row[2]}")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(list_all_categories())
