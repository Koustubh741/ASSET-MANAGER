from app.database.database import engine
from sqlalchemy import text

def check():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'audit_logs' AND table_schema = 'system'"))
        columns = [row[0] for row in result.fetchall()]
        print(f"AuditLog Columns: {columns}")

if __name__ == "__main__":
    check()
