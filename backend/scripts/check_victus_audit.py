
import sys
import os

# Internal imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.database.database import SessionLocal
from app.models.models import AuditLog

def check_audit_log():
    session = SessionLocal()
    try:
        # Look for the last AuditLog for the victus asset ID
        # Victus ID from previous check: 54fd4795-edae-48f6-8a8f-8da497b0c8f1
        victus_id = "54fd4795-edae-48f6-8a8f-8da497b0c8f1"
        logs = session.query(AuditLog).filter(
            AuditLog.entity_id == victus_id,
            AuditLog.action.ilike('%WORKFLOW_APPROVE%')
        ).order_by(AuditLog.timestamp.desc()).all()

        print(f"--- Audit Log Report for Victus ({victus_id}) ---")
        if not logs:
            print("No audit logs found.")
        for log in logs:
            print(f"Action: {log.action}")
            print(f"User ID: {log.performed_by}")
            print(f"Details: {log.details}")
            print(f"Timestamp: {log.timestamp}")
            print("-" * 30)
    finally:
        session.close()

if __name__ == "__main__":
    check_audit_log()
