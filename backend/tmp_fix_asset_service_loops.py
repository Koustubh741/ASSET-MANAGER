import os
import re

file_path = r'd:\ASSET-MANAGER\backend\app\services\asset_service.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Ensure Dict is imported
if 'from typing import List, Optional, Any' in content and 'Dict' not in content:
    content = content.replace('from typing import List, Optional, Any', 'from typing import List, Optional, Any, Dict')

# 2. Pattern for the loop replacement
loop_pattern = r'for asset in result\.unique\(\)\.scalars\(\)\.all\(\):\s+asset = _sanitize_asset\(asset\)\s+res = AssetResponse\.model_validate\(asset\)\s+if asset\.assigned_user:\s+res\.assigned_to = asset\.assigned_user\.full_name\s+res\.assigned_to_id = asset\.assigned_user\.id\s+results\.append\(res\)'

replacement = 'for asset in result.unique().scalars().all():\n            asset_data = _populate_asset_data(asset)\n            results.append(AssetResponse.model_validate(asset_data))'

# Use re.sub with dotall and whitespace normalization
content = re.sub(loop_pattern, replacement, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully applied re-population logic to asset_service.py loops.")
