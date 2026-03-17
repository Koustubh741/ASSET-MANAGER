
from app.database.database import engine
from sqlalchemy import text

def sync_db():
    print(f"=== SYNCING DATABASE AT {engine.url.host} ===")
    
    with engine.connect() as conn:
        # 1. Check/Add columns to auth.users
        res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_schema='auth' AND table_name='users'"))
        existing_cols = [r[0] for r in res]
        print(f"Existing columns: {existing_cols}")
        
        needed_cols = [
            ("full_name", "VARCHAR(255)"),
            ("password_hash", "VARCHAR(255)"),
            ("status", "VARCHAR(50) DEFAULT 'ACTIVE'"),
            ("position", "VARCHAR(50)"),
            ("domain", "VARCHAR(50)"),
            ("department", "VARCHAR(100)"),
            ("location", "VARCHAR(100)"),
            ("updated_at", "TIMESTAMP WITH TIME ZONE DEFAULT NOW()")
        ]
        
        for col_name, col_def in needed_cols:
            if col_name not in existing_cols:
                print(f"Adding {col_name}...")
                conn.execute(text(f"ALTER TABLE auth.users ADD COLUMN {col_name} {col_def}"))
                conn.commit()
            else:
                print(f"Column {col_name} already exists.")

        # 2. Fix constraints
        print("Fixing constraints...")
        try:
            conn.execute(text("ALTER TABLE auth.users ALTER COLUMN username DROP NOT NULL"))
            conn.commit()
            print("Username set to nullable.")
        except Exception as e:
            print(f"Username alter error (likely already nullable): {e}")

        try:
            conn.execute(text("ALTER TABLE auth.users ALTER COLUMN created_at SET DEFAULT NOW()"))
            conn.commit()
            print("Created_at default set.")
        except Exception as e:
            print(f"Created_at alter error: {e}")

        # 3. Activate all
        print("Activating all users...")
        conn.execute(text("UPDATE auth.users SET status = 'ACTIVE' WHERE status IS NULL OR status = 'PENDING'"))
        conn.commit()
        
    print("=== SYNC COMPLETE ===")

if __name__ == "__main__":
    try:
        sync_db()
    except Exception as e:
        print(f"Sync failed: {e}")
