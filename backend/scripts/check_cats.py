from sqlalchemy import text, create_engine
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/itsm").replace("postgresql+asyncpg://", "postgresql://")
engine = create_engine(DATABASE_URL)

def check_categories():
    with engine.connect() as conn:
        res = conn.execute(text("SELECT category, count(*) FROM helpdesk.tickets GROUP BY category"))
        for row in res:
            print(f"{row[0]}: {row[1]}")

if __name__ == "__main__":
    check_categories()
