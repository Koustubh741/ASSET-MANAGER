import os
import re

file_path = r'd:\ASSET-MANAGER\backend\app\services\notification_service.py'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern for AssetRequest re-fetches
# select(AssetRequest).filter(...)
# We want to insert .options(joinedload(AssetRequest.requester).joinedload(User.dept_obj))

p1 = re.compile(r'select\(AssetRequest\)\.filter')
new_content = p1.sub('select(AssetRequest).options(joinedload(AssetRequest.requester).joinedload(User.dept_obj)).filter', content)

# Also fix notify_ticket_created re-fetch for User (needs dept_obj)
# select(User).options(joinedload(Ticket.assignment_group)).filter(...) -> wait, the one for requester
p2 = re.compile(r'select\(User\)\.filter\(User\.id == ticket\.requestor_id\)')
new_content = p2.sub('select(User).options(joinedload(User.dept_obj)).filter(User.id == ticket.requestor_id)', new_content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Successfully updated notification_service.py with widespread joinedload options (using utf-8).")
