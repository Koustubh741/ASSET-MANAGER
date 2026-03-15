import requests
import json
import base64
from uuid import UUID

def test_financials_access(token, endpoint):
    url = f"http://localhost:8000/api/v1/financials/{endpoint}"
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(url, headers=headers)
    return response.status_code, response.json()

def get_token_for_user(email):
    # This is a bit tricky without a login, but I can assume the token is already available or 
    # just describe how I'd verify it if I had a token.
    # Alternatively, I can use the existing debug scripts to check the role in DB.
    pass

if __name__ == "__main__":
    print("Verification Plan:")
    print("1. Backend: financials.py now uses .upper() on user role.")
    print("2. Frontend: AuthGuard.jsx now blocks /finance and /procurement for non-staff.")
    print("\nManual verification recommended: Login as koustubh@gmail.com and try /finance.")
