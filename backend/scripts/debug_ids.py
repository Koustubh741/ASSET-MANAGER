
from app.database.database import SessionLocal
from app.models.models import AssetRequest, User

def check_ids():
    db = SessionLocal()
    try:
        # Get the request we know exists
        req_id = "240da41f-2f2a-4db2-81df-5634589c2f64"
        req = db.query(AssetRequest).filter(AssetRequest.id == req_id).first()
        
        if req:
            print(f"Request ID: {req.id}")
            print(f"Status: {req.status}")
            print(f"Requester ID: {req.requester_id}")
            
            # Get the user details for this requester
            requester = db.query(User).filter(User.id == req.requester_id).first()
            if requester:
                print(f"Requester Name: {requester.full_name}")
                print(f"Requester Email: {requester.email}")
                print(f"Requester Role: {requester.role}")
            else:
                print("Requester User NOT FOUND in Users table!")
        else:
            print(f"Request {req_id} NOT FOUND!")

        print("-" * 30)
        
        # Check 'end' user details to see if they match
        # Assuming 'end' is the name based on the screenshot showing "end"
        user = db.query(User).filter(User.full_name.ilike("end%")).first()
        if user:
             print(f"User 'end' ID: {user.id}")
             print(f"User 'end' Email: {user.email}")
        else:
             print("User 'end' NOT FOUND in DB")

    finally:
        db.close()

if __name__ == "__main__":
    check_ids()
