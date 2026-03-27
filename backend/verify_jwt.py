from jose import jwt, JWTError
import os

SECRET_KEY = "development-secret-key-change-in-production"
ALGORITHM = "HS256"

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbkBpdHNtLmNvbSIsInVzZXJfaWQiOiI4ZmU0MjU3MS1kMGRmLTQwMjgtYWMwNC04MGRiNWI0YWRjNWQiLCJyb2xlIjoiQURNSU4iLCJleHAiOjE3NzQyOTMyMjAsInR5cGUiOiJhY2Nlc3MifQ.SVTPDAV8dmNaZKTTBq6dDiOpXLeBns-zU2InDDQrVE8"

try:
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    print("Verification SUCCESSful")
    print(payload)
except JWTError as e:
    print(f"Verification FAILED: {e}")
except Exception as e:
    print(f"Error: {e}")
