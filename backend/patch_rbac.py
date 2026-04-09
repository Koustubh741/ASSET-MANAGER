import os

def patch_asset_requests():
    path = "d:/ASSET-MANAGER/backend/app/routers/asset_requests.py"
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    content = open(path, 'r').read()
    
    # Target 1: verify_it_authorization (Already patched in some turns, checking)
    old_verify = 'if user.role != "IT_MANAGEMENT":\n        raise HTTPException(status_code=403, detail="Not IT_MANAGEMENT")'
    new_verify = 'if user.role not in ["IT_MANAGEMENT", "SUPPORT", "ADMIN"]:\n        raise HTTPException(status_code=403, detail="Not IT_MANAGEMENT or SUPPORT")'
    
    # Target 2: it_approve_request
    old_approve = 'reviewer = current_user\n    if reviewer.role != "IT_MANAGEMENT" and reviewer.role != "ADMIN":\n        raise HTTPException(status_code=403, detail="Not IT_MANAGEMENT")'
    new_approve = 'reviewer = current_user\n    if reviewer.role not in ["IT_MANAGEMENT", "SUPPORT", "ADMIN"]:\n        raise HTTPException(status_code=403, detail="Not IT_MANAGEMENT or SUPPORT")'

    updated = content.replace(old_verify, new_verify).replace(old_approve, new_approve)
    
    if updated != content:
        with open(path, 'w') as f:
            f.write(updated)
        print("✅ Successfully patched asset_requests.py")
    else:
        print("⚠️ No changes made. Targets might have already been patched or were not found.")

if __name__ == "__main__":
    patch_asset_requests()
