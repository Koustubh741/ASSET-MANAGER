import os
import re

file_path = r'd:\ASSET-MANAGER\backend\app\routers\asset_requests.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Comment out send_notification calls in Stage 7 and 8 to isolate the bug
content = content.replace('await send_notification(db, id, "status_change"', '# await send_notification(db, id, "status_change"')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Temporarily disabled notifications in Stage 7/8 routers for isolation.")
