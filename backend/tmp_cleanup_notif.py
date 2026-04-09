import os
import re

file_path = r'd:\ASSET-MANAGER\backend\app\services\notification_service.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the manual joinedload additions I made earlier
content = content.replace('.options(joinedload(AssetRequest.requester).joinedload(User.dept_obj))', '')
content = content.replace('.options(joinedload(User.dept_obj))', '')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Cleaned up manual joinedload from notification_service.py (rely on models).")
