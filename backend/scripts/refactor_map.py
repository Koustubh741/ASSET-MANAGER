import os, re
import sys
sys.stdout.reconfigure(encoding='utf-8')

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the const PERSONA_MAP block
    pattern = re.compile(r'const PERSONA_MAP = \{.*?\n\};\n', re.DOTALL)
    
    if pattern.search(content):
        # Remove the PERSONA_MAP const
        content = pattern.sub('', content)
        
        # Add import at the top
        import_stmt = "import { PERSONA_MAP } from '../config/v2_persona_map';\n"
        
        if import_stmt not in content:
            first_import = content.find('import ')
            content = content[:first_import] + import_stmt + content[first_import:]
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Replaced in {filepath}')
    else:
        print(f'Pattern not found in {filepath}')

replace_in_file(r'd:\ASSET-MANAGER\frontend\pages\users.jsx')
replace_in_file(r'd:\ASSET-MANAGER\frontend\pages\login.jsx')
