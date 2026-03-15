
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/asset_manager"

async def check_tickets():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        result = await session.execute(text("SELECT id, subject, category, related_asset_id FROM support.tickets ORDER BY created_at DESC LIMIT 5;"))
        tickets = result.all()
        print("Latest Tickets in DB:")
        for t in tickets:
            print(f"ID: {t.id} | Subject: {t.subject} | Category: {t.category} | Asset Link: {t.related_asset_id}")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_tickets())
