import sys
import os
# Add the current directory to sys.path
sys.path.append(os.getcwd())

from app.database.database import engine
from sqlalchemy import text

def check_db():
    try:
        with engine.connect() as conn:
            # Check for active queries
            res = conn.execute(text("SELECT pid, query, state, wait_event_type, wait_event, query_start FROM pg_stat_activity WHERE state != 'idle'"))
            print(f"{'PID':<10} | {'State':<10} | {'Wait Event':<20} | {'Started':<30} | {'Query'}")
            print("-" * 120)
            for row in res:
                print(f"{row.pid:<10} | {row.state:<10} | {row.wait_event or 'None':<20} | {str(row.query_start):<30} | {row.query[:100]}")
    except Exception as e:
        print(f"Error checking DB: {e}")

if __name__ == "__main__":
    check_db()
