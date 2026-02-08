from app.database.database import engine
from sqlalchemy import text

def verify():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name IN ('sso_provider', 'sso_id')"))
        columns = [row[0] for row in result]
        print(f"Found columns: {columns}")
        if 'sso_provider' in columns and 'sso_id' in columns:
            print("VERIFICATION SUCCESSFUL: All SSO columns are present.")
        else:
            print("VERIFICATION FAILED: Missing SSO columns.")

if __name__ == "__main__":
    verify()
