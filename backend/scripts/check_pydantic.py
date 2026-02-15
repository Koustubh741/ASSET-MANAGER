from app.database.database import SessionLocal
from app.services import user_service
from app.schemas.user_schema import UserResponse

db = SessionLocal()
try:
    users = user_service.get_users(db, status="PENDING")
    print(f"Count: {len(users)}")
    if users:
        user = users[0]
        print(f"ID: {user.id}, Type: {type(user.id)}")
        # Try to validate with Pydantic
        try:
            res = UserResponse.model_validate(user)
            print("Pydantic validation SUCCESS")
        except Exception as e:
            print(f"Pydantic validation FAILED: {e}")
finally:
    db.close()
