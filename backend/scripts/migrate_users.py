from app.database.database import engine
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    with engine.connect() as conn:
        logger.info("Adding sso_provider column...")
        conn.execute(text("ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS sso_provider VARCHAR(50)"))
        
        logger.info("Adding sso_id column...")
        conn.execute(text("ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS sso_id VARCHAR(255)"))
        
        conn.commit()
        logger.info("Migration complete.")

if __name__ == "__main__":
    migrate()
