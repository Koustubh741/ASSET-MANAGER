
from app.database.database import SessionLocal
from app.models.models import AssetRequest, User

def list_requests():
    db = SessionLocal()
    try:
        requests = db.query(AssetRequest).all()
        with open("requests_dump.txt", "w", encoding="utf-8") as f:
            f.write(f"{'ID':<38} | {'Status':<30} | {'Requester'}\n")
            f.write("-" * 100 + "\n")
            for req in requests:
                requester = db.query(User).filter(User.id == req.requester_id).first()
                requester_name = requester.full_name if requester else "Unknown"
                f.write(f"{str(req.id):<38} | {req.status:<30} | {requester_name}\n")
    finally:
        db.close()

if __name__ == "__main__":
    list_requests()
