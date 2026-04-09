import os
import re

service_file = r'd:\ASSET-MANAGER\backend\app\services\asset_request_service.py'

with open(service_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Reliable re-fetch fix for update_procurement_finance_status
# We replace the line that uses db_request.id with request_id

if "AssetRequest.id == db_request.id" in content:
    content = content.replace("AssetRequest.id == db_request.id", "AssetRequest.id == request_id")
    with open(service_file, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Successfully fixed re-fetch query to use request_id.")
else:
    print("Could not find the target line. It might already be fixed or different.")
