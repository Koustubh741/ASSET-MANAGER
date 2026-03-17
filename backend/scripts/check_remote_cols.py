
from app.database.database import engine
from sqlalchemy import text

def check_db():
    print(f"Checking DB at {engine.url.host}...")
    with engine.connect() as conn:
        res = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='auth' AND table_name='users'"))
        for row in res:
            print(f" - {row[0]} ({row[1]})")

if __name__ == "__main__":
    check_db()
