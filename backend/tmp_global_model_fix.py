import os
import re

file_path = r'd:\ASSET-MANAGER\backend\app\models\models.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update all relationship() calls to include lazy="selectin" if not present
# Regex matches relationship(...) and ensures lazy="selectin" is added correctly.
# It skips if lazy= is already there (we don't want to duplicate or overwrite different loading types manually set)

def add_lazy_selectin(match):
    args = match.group(1)
    if 'lazy=' in args:
        return f"relationship({args})"
    
    # Add lazy="selectin"
    if args.strip().endswith(','):
        new_args = f"{args} lazy='selectin'"
    elif args.strip():
        new_args = f"{args}, lazy='selectin'"
    else:
        new_args = "lazy='selectin'"
    
    return f"relationship({new_args})"

# Replace all relationship calls
new_content = re.sub(r'relationship\((.*?)\)', add_lazy_selectin, content, flags=re.DOTALL)

# 2. Specifically remove problematic hybrid properties
# User.department
new_content = re.sub(r'\s+@hybrid_property\s+def department\(self\):.*?\n\s+return self\.dept_obj\.name if self\.dept_obj else None\n', '', new_content, flags=re.DOTALL)
new_content = re.sub(r'\s+@department\.expression\s+def department\(cls\):.*?\n\s+return select\(Department\.name\)\.where\(Department\.id == cls\.department_id\)\.scalar_subquery\(\)\n', '', new_content, flags=re.DOTALL)

# Ticket.requestor_name/department/etc? No, those were in service.
# Let's check for other hybrids. 
# Search for other relationship-accessing hybrid properties

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Successfully applied global relationship hardening to models.py.")
