
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/asset_manager"

async def check_asset_types():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        result = await session.execute(text("SELECT DISTINCT type FROM asset.assets;"))
        types = result.all()
        print("Distinct Asset Types in DB:")
        for t in types:
            print(f"- {t[0]}")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_asset_types())
