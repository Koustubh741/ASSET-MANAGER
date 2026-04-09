import os
import re

file_path = r'd:\ASSET-MANAGER\backend\app\models\models.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace duplicated lazy keywords
# We look for relationship calls and clean up repetitive lazy= arguments
def clean_relationship(match):
    args = match.group(1)
    # If lazy= appears multiple times, keep only the first one (or standardize)
    if args.count('lazy=') > 1:
        # standard is lazy="selectin" or lazy='selectin'
        # We'll remove all lazy= parts and add one at the end if it was there
        new_args = re.sub(r',\s*lazy=[\'"][^\'"]+[\'"]', '', args)
        if new_args.strip().endswith(','):
            return f'relationship({new_args} lazy="selectin")'
        else:
            return f'relationship({new_args}, lazy="selectin")'
    return f'relationship({args})'

new_content = re.sub(r'relationship\((.*?)\)', clean_relationship, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Systematically cleaned up duplicate lazy keywords in models.py.")
