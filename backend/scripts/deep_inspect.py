
from app.database.database import SessionLocal
from app.models.models import AssetRequest, User

def deep_inspect():
    db = SessionLocal()
    try:
        # Get all requests
        reqs = db.query(AssetRequest).all()
        print(f"Total requests in DB: {len(reqs)}")
        for r in reqs:
            print(f"ID: {r.id}")
            print(f"  Status: {r.status}")
            print(f"  Requester ID (repr): {repr(r.requester_id)}")
            print(f"  Requester ID (type): {type(r.requester_id)}")
            
        print("\n" + "="*50 + "\n")
        
        # Get all users
        users = db.query(User).all()
        print(f"Total users in DB: {len(users)}")
        for u in users:
            print(f"User ID (repr): {repr(u.id)}")
            print(f"  Name: {u.full_name}")
            print(f"  Email: {u.email}")
            
    finally:
        db.close()

if __name__ == "__main__":
    deep_inspect()
