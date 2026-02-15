from app.database.database import engine
from sqlalchemy import text

def check_tickets():
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT count(*) FROM support.tickets"))
            print(f"Ticket count in support.tickets: {result.scalar()}")
            
            # Also check helpdesk.tickets just in case
            result = conn.execute(text("SELECT count(*) FROM helpdesk.tickets"))
            print(f"Ticket count in helpdesk.tickets: {result.scalar()}")
    except Exception as e:
        print(f"Error checking tickets: {e}")

if __name__ == "__main__":
    check_tickets()
