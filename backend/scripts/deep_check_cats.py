from sqlalchemy import text, create_engine
import os
from dotenv import load_dotenv

# Explicitly load .env from project root
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(base_dir, ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("WARNING: DATABASE_URL not found in .env, using default!")
    DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/itsm"

SYNC_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
print(f"Connecting to: {SYNC_URL}")
engine = create_engine(SYNC_URL)

def deep_check(days=30):
    with engine.connect() as conn:
        print(f"--- Ticket Categories (support.tickets - {days} DAYS) ---")
        query = text(f"SELECT category, count(*) FROM support.tickets WHERE created_at >= NOW() - INTERVAL '{days} days' GROUP BY category")
        res = conn.execute(query)
        for row in res:
            print(f"'{row[0]}': {row[1]}")

if __name__ == "__main__":
    for d in [7, 30, 90]:
        deep_check(d)
        print("-" * 20)

if __name__ == "__main__":
    deep_check()
