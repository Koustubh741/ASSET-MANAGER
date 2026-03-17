import asyncio
import logging
from sqlalchemy import text
from app.database.database import async_engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def patch_db():
    try:
        async with async_engine.begin() as conn:
            logger.info("Adding capex_opex to procurement.purchase_orders...")
            await conn.execute(text("ALTER TABLE procurement.purchase_orders ADD COLUMN capex_opex VARCHAR(10);"))
            
            logger.info("Adding tax_amount to procurement.purchase_orders...")
            await conn.execute(text("ALTER TABLE procurement.purchase_orders ADD COLUMN tax_amount FLOAT DEFAULT 0.0;"))
            
            logger.info("Adding shipping_handling to procurement.purchase_orders...")
            await conn.execute(text("ALTER TABLE procurement.purchase_orders ADD COLUMN shipping_handling FLOAT DEFAULT 0.0;"))
            
        logger.info("Database patched successfully.")
    except Exception as e:
        logger.error(f"Error patching database: {e}")
        # Note: If columns already exist, this will throw an error, which is fine to ignore for idempotency
        if 'already exists' in str(e).lower():
            logger.info("Columns already exist, continuing.")
        else:
            raise

if __name__ == "__main__":
    asyncio.run(patch_db())
