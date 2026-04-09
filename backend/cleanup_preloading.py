import os

def cleanup_preloading():
    path = "d:/ASSET-MANAGER/backend/app/services/asset_request_service.py"
    if not os.path.exists(path):
        return

    content = open(path, 'r').read()
    
    # Root Fix: The previous script was run twice or incorrectly matched.
    # We want exactly one level of nested joinedload.
    
    # 1. First, collapse all multiple dept_obj loads
    import re
    # Match any sequence of .joinedload(User.dept_obj) repeats
    pattern = r'(\.joinedload\(User\.dept_obj\))+'
    updated = re.sub(pattern, r'.joinedload(User.dept_obj)', content)
    
    # 2. Do the same for selectinload
    pattern_si = r'(\.selectinload\(User\.dept_obj\))+'
    updated = re.sub(pattern_si, r'.selectinload(User.dept_obj)', updated)

    if updated != content:
        with open(path, 'w') as f:
            f.write(updated)
        print("✅ Successfully cleaned up relationship pre-loading in asset_request_service.py")
    else:
        print("⚠️ No changes needed.")

if __name__ == "__main__":
    cleanup_preloading()
