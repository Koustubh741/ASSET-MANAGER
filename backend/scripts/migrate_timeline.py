from sqlalchemy import text
from app.database.database import engine

def migrate():
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            print("Adding timeline column to support.tickets...")
            conn.execute(text("ALTER TABLE support.tickets ADD COLUMN IF NOT EXISTS timeline JSON DEFAULT '[]'"))
            trans.commit()
            print("Migration successful!")
        except Exception as e:
            trans.rollback()
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
