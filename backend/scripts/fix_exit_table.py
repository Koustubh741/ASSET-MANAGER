from app.database.database import engine
from sqlalchemy import text
import models

def fix_exit_table():
    with engine.connect() as conn:
        print("Dropping exit.exit_requests table...")
        conn.execute(text("DROP TABLE IF EXISTS exit.exit_requests CASCADE"))
        conn.commit()
        print("Recreating all tables from models...")
        models.Base.metadata.create_all(bind=engine)
        print("Done!")

if __name__ == "__main__":
    fix_exit_table()
