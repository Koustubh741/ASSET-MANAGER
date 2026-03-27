import os
import re

path = r'd:\ASSET-MANAGER\backend\app\routers\patch_management.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the syntax error like )" ))
# This happened because of a typo in the previous script's f-string or matching
content = content.replace(')"\n    ))', '    ))')
content = content.replace(')"\n))', '))')

# Also fix the empty f"" in details
content = content.replace('f""', '""')

# Specific fix for the bulk deploy block which looks very broken
# 241:         entity_id=str(None),
# 242:         details={"message": f""}
# 243:     )"
# 244:     ))

bad_block = """        entity_id=str(None),
        details={"message": f""}
    )"
    ))"""
good_block = """        entity_id="ALL",
        details={"message": "Bulk patch deployment initiated"}
    ))"""
content = content.replace(bad_block, good_block)

bad_block_2 = """        entity_id=str(None),
        details={"message": f""}
    )"
    ))"""
# Well, they might be identical. Let's use re.

content = re.sub(r'details=\{"message": f""\}\s+\)"\s+\)\)', r'details={"message": "Administrative action logged"}\n    ))', content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed syntax errors in patch_management.py")
