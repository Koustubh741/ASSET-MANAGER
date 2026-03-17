from app.database.database import SessionLocal
from app.models.models import User

db = SessionLocal()
try:
    user = db.query(User).filter(User.full_name == 'Koustubh').first()
    if user:
        user.role = 'IT_SUPPORT'
        user.position = 'System Specialist'
        db.commit()
        print("Updated Koustubh successfully.")
    else:
        print("User not found.")
finally:
    db.close()
