from app.database.database import SessionLocal
from app.models.models import AuditLog
from sqlalchemy import text

def show_latest_collected_data():
    db = SessionLocal()
    try:
        # Query the latest audit log entry
        latest = db.query(AuditLog).filter(
            AuditLog.action == "DATA_COLLECT"
        ).order_by(AuditLog.timestamp.desc()).first()
        
        if latest:
            print("\n" + "="*70)
            print("LATEST COLLECTED DATA FROM DATABASE")
            print("="*70)
            print(f"\nDatabase: ITSM")
            print(f"Schema: system")
            print(f"Table: audit_logs")
            print(f"\nRecord Details:")
            print(f"  ID: {latest.id}")
            print(f"  Entity Type: {latest.entity_type}")
            print(f"  Entity ID: {latest.entity_id}")
            print(f"  Action: {latest.action}")
            print(f"  Performed By: {latest.performed_by}")
            print(f"  Timestamp: {latest.timestamp}")
            print(f"\n  Collected Data (details column):")
            print(f"  {latest.details}")
            print("\n" + "="*70)
            
            # Show SQL query to access this data
            print("\nTo query this data directly in PostgreSQL:")
            print("  SELECT * FROM system.audit_logs WHERE action = 'DATA_COLLECT' ORDER BY timestamp DESC LIMIT 1;")
            print("="*70 + "\n")
        else:
            print("No collected data found in database.")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    show_latest_collected_data()
