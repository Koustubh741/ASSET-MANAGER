from app.database.database import SessionLocal
from app.models.models import AuditLog

def verify_collected_data():
    db = SessionLocal()
    try:
        # Query all audit logs with action DATA_COLLECT
        logs = db.query(AuditLog).filter(AuditLog.action == "DATA_COLLECT").all()
        
        print(f"\n=== COLLECTED DATA IN DATABASE ===")
        print(f"Total entries: {len(logs)}\n")
        
        for log in logs:
            print(f"ID: {log.id}")
            print(f"Action: {log.action}")
            print(f"Performed By: {log.performed_by}")
            print(f"Details: {log.details}")
            print(f"Timestamp: {log.timestamp}")
            print("-" * 50)
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    verify_collected_data()
