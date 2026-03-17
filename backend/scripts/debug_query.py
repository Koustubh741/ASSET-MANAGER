
from app.database.database import SessionLocal
from app.models.models import AssetRequest

def check_by_requester():
    db = SessionLocal()
    target_requester_id = "5300ac1c-7607-4e63-9ee3-b8d0566b65d6"
    try:
        print(f"Querying for requester_id: '{target_requester_id}'")
        requests = db.query(AssetRequest).filter(AssetRequest.requester_id == target_requester_id).all()
        print(f"Found {len(requests)} requests.")
        for r in requests:
            print(f" - {r.id}: {r.status} (Requester ID in DB: '{r.requester_id}')")
            
        # Check if there are ANY requests for ANY requester
        all_reqs = db.query(AssetRequest).limit(5).all()
        print("\nFirst 5 requests in DB:")
        for r in all_reqs:
             print(f" - {r.id}: {r.status} | Requester: '{r.requester_id}'")

    finally:
        db.close()

if __name__ == "__main__":
    check_by_requester()
