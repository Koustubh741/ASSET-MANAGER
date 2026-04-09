import os

file_path = r'd:\ASSET-MANAGER\backend\app\models\models.py'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.read().splitlines()

new_lines = []
for line in lines:
    if 'relationship(' in line and 'lazy="selectin"' in line:
        # Check if lazy="selectin" appears twice (either single or double quotes)
        # We also need to check for lazy='selectin'
        # A simple way to fix the double lazy= is to find the first one and then remove subsequent ones in the same line
        parts = line.split('lazy=')
        if len(parts) > 2:
            # Reconstruct with only one lazy=
            # parts[0] is everything before first lazy=
            # parts[1] is the value of the first lazy= and everything until the next lazy=
            # portions after that are removed or merged
            
            # More robust: find the last occurrence of 'lazy="selectin"' or "lazy='selectin'" if it's redundant
            fixed_line = re.sub(r',\s*lazy=[\'"]selectin[\'"]', '', line, count=0)
            # Then add it back once
            if 'lazy=' not in fixed_line:
                 fixed_line = line.replace('lazy="selectin", lazy="selectin"', 'lazy="selectin"')
                 fixed_line = fixed_line.replace("lazy='selectin', lazy='selectin'", "lazy='selectin'")
                 fixed_line = fixed_line.replace('lazy="selectin", lazy=\'selectin\'', 'lazy="selectin"')
                 fixed_line = fixed_line.replace("lazy='selectin', lazy=\"selectin\"", "lazy='selectin'")
            new_lines.append(fixed_line)
        else:
            new_lines.append(line)
    else:
        new_lines.append(line)

# Let's use a simpler but more reliable regex for this specific fix
content = "\n".join(new_lines)
import re
# Match relationship(..., lazy="selectin", ..., lazy="selectin")
# This is tricky with regex. Let's just do a string replacement for the most common doubled pattern.
content = content.replace(', lazy="selectin", lazy="selectin"', ', lazy="selectin"')
content = content.replace(", lazy='selectin', lazy='selectin'", ", lazy='selectin'")
content = content.replace(', lazy="selectin" lazy="selectin"', ', lazy="selectin"') # In case comma was missing

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully fixed repeated lazy keyword in models.py.")
