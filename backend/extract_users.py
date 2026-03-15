import sys
import os
from collections import defaultdict

# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.database import SessionLocal
from app.models.models import User

def get_responsibility(user):
    role = user.role.upper()
    pos = (user.position or "").upper()
    
    if role == "ADMIN":
        return "Full System Admin & User Management"
    elif role == "IT_MANAGEMENT":
        return "IT Approval & Infrastructure Management"
    elif role == "ASSET_MANAGER":
        return "Inventory Tracking & Asset Lifecycle"
    elif role == "FINANCE":
        return "Budget Validation & Financial Approval"
    elif role == "PROCUREMENT":
        return "PO Generation & Vendor Procurement"
    elif role == "MANAGER" or pos == "MANAGER":
        return "Departmental Asset Request Approval"
    else:
        return "Standard Employee / Asset Requester"

def extract_users():
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.status == 'ACTIVE').all()
        
        # Group by department
        dept_groups = defaultdict(list)
        for u in users:
            dept = u.department or u.domain or "Unassigned"
            dept_groups[dept].append(u)
            
        print("USER LIST BY DEPARTMENT WITH RESPONSIBILITIES")
        print("=" * 140)
        
        for dept in sorted(dept_groups.keys()):
            print(f"\nDEPARTMENT: {dept}")
            print("-" * 140)
            print(f"{'Full Name':30} | {'Email':35} | {'Responsibilities':45}")
            print("-" * 140)
            for u in sorted(dept_groups[dept], key=lambda x: x.full_name):
                resp = get_responsibility(u)
                print(f"{u.full_name:30} | {u.email:35} | {resp:45}")
            print(f"Total in {dept}: {len(dept_groups[dept])}")
            
        print("\n" + "=" * 140)
        print(f"GRAND TOTAL: {len(users)} ACTIVE USERS")
        
    finally:
        db.close()

if __name__ == "__main__":
    extract_users()
