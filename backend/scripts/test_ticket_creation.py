from app.database.database import SessionLocal
from app.models.models import Ticket
import uuid

def test_create_ticket():
    db = SessionLocal()
    try:
        new_ticket = Ticket(
            id=str(uuid.uuid4()),
            subject="Verification Ticket",
            description="Testing schema mapping",
            status="Open",
            priority="Low",
            category="Software",
            requestor_id="test-user"
        )
        db.add(new_ticket)
        db.commit()
        print("Ticket created successfully in DB!")
    except Exception as e:
        db.rollback()
        print(f"Error creating ticket: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_create_ticket()
