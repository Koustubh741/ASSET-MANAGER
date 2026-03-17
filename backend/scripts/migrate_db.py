
from sqlalchemy import text
from app.database.database import engine

def migrate_id_type():
    with engine.connect() as conn:
        print("Altering id column type in asset.assets...")
        try:
            # Drop primary key constraint first if necessary, or just alter type
            # In Postgres, changing UUID to VARCHAR usually works with USING clause if needed
            # But here we probably just want to change it to TEXT/VARCHAR
            conn.execute(text("ALTER TABLE asset.assets ALTER COLUMN id TYPE VARCHAR(255)"))
            conn.execute(text("COMMIT"))
            print("Successfully changed id type to VARCHAR")
        except Exception as e:
            print(f"Failed to migrate: {e}")

if __name__ == "__main__":
    migrate_id_type()
