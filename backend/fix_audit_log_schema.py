import os
import re

path = r'd:\ASSET-MANAGER\backend\app\routers\patch_management.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to find AuditLog calls
# e.g., AuditLog(
#    id=uuid.uuid4(),
#    user_id=user.id,
#    action="PATCH_DEPLOY",
#    target_type="ASSET",
#    target_id=deployment.asset_id,
#    details=f"Deployed patch..."
# )

# Replacement logic:
# performed_by=user.id
# entity_type="Asset" (proper case or same as before)
# entity_id=str(deployment.asset_id)
# details={"msg": f"..."}

def fix_audit_log(match):
    original = match.group(0)
    
    # Extract fields
    user_id_match = re.search(r'user_id=([^,]+)', original)
    action_match = re.search(r'action="([^"]+)"', original)
    target_type_match = re.search(r'target_type="([^"]+)"', original)
    target_id_match = re.search(r'target_id=([^,]+)', original)
    details_match = re.search(r'details=f?"([^"]+)"', original)
    
    user_id = user_id_match.group(1) if user_id_match else "None"
    action = action_match.group(1) if action_match else "UNKNOWN"
    target_type = target_type_match.group(1) if target_type_match else "System"
    target_id = target_id_match.group(1) if target_id_match else "None"
    details_str = details_match.group(1) if details_match else ""
    
    # Map target_type to properly titles or keep as is if it matches "Asset", "User", "Ticket"
    if target_type.lower() == "asset": target_type = "Asset"
    elif target_type.lower() == "system": target_type = "System"
    elif target_type.lower() == "schedule": target_type = "PatchSchedule"
    elif target_type.lower() == "deployment": target_type = "PatchDeployment"

    # Construct new call
    new_call = f"""AuditLog(
        id=uuid.uuid4(),
        performed_by={user_id},
        action="{action}",
        entity_type="{target_type}",
        entity_id=str({target_id}),
        details={{"message": f"{details_str}"}}
    )"""
    return new_call

# Use regex to find and replace AuditLog constructors
# This regex is a bit greedy but should work for my specific pattern
content = re.sub(r'AuditLog\(\s+id=uuid\.uuid4\(\),\s+user_id=[^)]+\)', fix_audit_log, content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Batch fixed AuditLog entries in patch_management.py")
