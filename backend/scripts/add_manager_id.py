from sqlalchemy import text
from app.database.database import engine

def add_manager_id_column():
    try:
        with engine.connect() as conn:
            print("[INFO] Adding manager_id column to auth.users...")
            conn.execute(text("ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS manager_id UUID"))
            conn.commit()
            print("[OK] Column added successfully!")
    except Exception as e:
        print(f"[ERROR] Failed to add column: {e}")

if __name__ == "__main__":
    add_manager_id_column()
