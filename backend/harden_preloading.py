import os

def harden_preloading():
    path = "d:/ASSET-MANAGER/backend/app/services/asset_request_service.py"
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    content = open(path, 'r').read()
    
    # Replace joinedload
    updated = content.replace(
        "joinedload(AssetRequest.requester)", 
        "joinedload(AssetRequest.requester).joinedload(User.dept_obj)"
    )
    
    # Replace selectinload
    updated = updated.replace(
        "selectinload(AssetRequest.requester)", 
        "selectinload(AssetRequest.requester).selectinload(User.dept_obj)"
    )

    if updated != content:
        with open(path, 'w') as f:
            f.write(updated)
        print("✅ Successfully hardened relationship pre-loading in asset_request_service.py")
    else:
        print("⚠️ No changes made. Patterns might not have been found.")

if __name__ == "__main__":
    harden_preloading()
