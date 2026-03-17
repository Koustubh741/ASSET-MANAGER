import sys
import os
from collections import defaultdict

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.database import SessionLocal
from app.models.models import User

def get_workflow_details(user):
    role = user.role.upper()
    pos = (user.position or "").upper()
    
    if role == "ADMIN":
        return {
            "title": "System Administrator",
            "desc": "Full system oversight, user management, and configuration of all workflow stages."
        }
    elif role == "IT_MANAGEMENT":
        return {
            "title": "IT Technical Approver",
            "desc": "Validates hardware/software technical specs, hardware availability, and technical feasibility."
        }
    elif role == "ASSET_MANAGER":
        return {
            "title": "Inventory Manager",
            "desc": "qr coding, asset intake, physical inventory tracking, and lifecycle updates."
        }
    elif role == "FINANCE":
        return {
            "title": "Financial Approver",
            "desc": "Performs budget checks, cost validation, and validates financial impact of requests."
        }
    elif role == "PROCUREMENT":
        return {
            "title": "Procurement Officer",
            "desc": "Manages vendor relationships and issues Purchase Orders (POs) for new assets."
        }
    elif role == "MANAGER" or pos == "MANAGER":
        return {
            "title": "Departmental Approver",
            "desc": "Initial approval of requests from their department; validates business necessity."
        }
    else:
        return {
            "title": "Asset Requester",
            "desc": "Standard employee who submits requests for personal or team assets and tracks their status."
        }

def extract_workflow_users():
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.status == 'ACTIVE').all()
        
        # Group by Workflow Role
        workflow_groups = defaultdict(list)
        for u in users:
            details = get_workflow_details(u)
            workflow_groups[details["title"]].append((u, details["desc"]))
            
        print("\n" + "="*160)
        print(f"{'ASSET MANAGEMENT WORKFLOW ROLE DIRECTORY':^160}")
        print("="*160)
        
        # Consistent order for roles
        order = [
            "System Administrator",
            "Departmental Approver",
            "IT Technical Approver",
            "Inventory Manager",
            "Financial Approver",
            "Procurement Officer",
            "Asset Requester"
        ]
        
        for root_role in order:
            users_in_group = workflow_groups[root_role]
            if users_in_group:
                print(f"\nROLE: {root_role.upper()}")
                print(f"Primary Workflow Function: {users_in_group[0][1]}")
                print("-" * 160)
                print(f"{'Full Name':30} | {'Email':40} | {'Department':30}")
                print("-" * 160)
                for u, _ in sorted(workflow_groups[root_role], key=lambda x: x[0].full_name):
                    dept = u.department or u.domain or "Corporate"
                    print(f"{u.full_name:30} | {u.email:40} | {dept:30}")
                print(f"Count: {len(workflow_groups[root_role])}")
                
        print("\n" + "="*160)
        print(f"GRAND TOTAL: {len(users)} ACTIVE USERS CONSOLIDATED IN DB")
        
    finally:
        db.close()

if __name__ == "__main__":
    extract_workflow_users()
