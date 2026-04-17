from app.database.database import SessionLocal
from app.models.models import User
import json
import os

def audit_personas():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        mapping_path = r'd:\ASSET-MANAGER\backend\scratch\persona_mapping_v3.json'
        with open(mapping_path, 'r') as f:
            persona_map = json.load(f)
            
        GENERIC_SET = {"HEAD", "MANAGER", "EXECUTIVE", "SENIOR_EXECUTIVE", "ASSISTANT_MANAGER", "JUNIOR_EXECUTIVE", "SUPPORT_LEAD", "TRAINER"}
        
        invalid_count = 0
        for user in users:
            dept = user.dept_obj
            dept_name = dept.name.upper() if dept else "UNKNOWN"
            if dept_name == "TECHNOLOGY": dept_name = "IT"
            
            valid_options = set(persona_map.get(dept_name, [])) # This list in JSON has objects, I need just values
            valid_values = {p['value'] for p in persona_map.get(dept_name, [])}
            
            p = user.persona
            if p not in valid_values and p not in GENERIC_SET:
                invalid_count += 1
                print(f"Invalid: User {user.username}, Dept {dept_name}, Persona {p}")
        
        print(f"Audit Result: {invalid_count} invalid personas found out of {len(users)} users.")
        
    finally:
        db.close()

if __name__ == "__main__":
    audit_personas()
