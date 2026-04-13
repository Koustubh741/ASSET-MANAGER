import sys
import os
import uuid
from datetime import datetime

# Add the parent directory to sys.path to allow importing from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app.utils.uuid_utils import get_uuid
    import uuid_utils
    print("✓ Successfully imported get_uuid and uuid_utils")
except ImportError as e:
    print(f"✗ Failed to import: {e}")
    sys.exit(1)

def verify_uuidv7():
    print("\n--- UUIDv7 Generation Test ---")
    
    # Generate a few UUIDs
    ids = [get_uuid() for _ in range(5)]
    
    for i, u in enumerate(ids):
        # Check version
        # The version is in the 7th byte, high 4 bits. 
        # In a UUID string xxxxxxxx-xxxx-Vxxx-xxxx-xxxxxxxxxxxx, it's the 'V'
        version = u.version
        is_v7 = version == 7
        
        # Check character at index 14 (which is the version)
        u_str = str(u)
        v_char = u_str[14]
        
        print(f"ID {i+1}: {u_str} | Version: {version} ({'✓ PASS' if is_v7 else '✗ FAIL'})")
        
    # Check if they are sequential (lexicographically sortable)
    is_sorted = ids == sorted(ids)
    print(f"IDs are sequential: {'✓ PASS' if is_sorted else '✗ FAIL'}")

if __name__ == "__main__":
    verify_uuidv7()
