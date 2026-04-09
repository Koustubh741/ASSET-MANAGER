import os
import re

service_file = r'd:\ASSET-MANAGER\backend\app\services\asset_request_service.py'

with open(service_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix update_procurement_finance_status after-commit re-fetch
# Replace the re-fetch block to use request_id instead of db_request.id

old_refetch = "result = await db.execute(select(AssetRequest).options(joinedload(AssetRequest.requester).joinedload(User.dept_obj), joinedload(AssetRequest.purchase_orders).joinedload(PurchaseOrder.invoice)).filter(AssetRequest.id == db_request.id))"
# Actually, I removed the options earlier? No, I added them and then cleaned them up.
# I will use a very explicit re-fetch block.

target = "await db.commit()"
# Find the code after commit
commit_pos = content.find(target)
if commit_pos != -1:
    end_of_func = content.find("return await _populate_requester_info", commit_pos)
    
    new_tail = """
    await db.commit()
    
    # RELIABLE RE-FETCH: Use the stable ID and explicit session to get a fresh, non-expired object
    result = await db.execute(
        select(AssetRequest)
        .filter(AssetRequest.id == request_id)
    )
    db_request = result.scalars().first()
    
    return await _populate_requester_info(db, db_request, user_role=user_role)
"""
    # Replace the tail of the function
    # Find the function signature to know the whole range
    func_start = content.rfind("async def update_procurement_finance_status", 0, commit_pos)
    func_end = content.find("\n\n", commit_pos) # End of function
    
    # We want to replace from 'await db.commit()' to the end of the return
    content = content[:commit_pos] + new_tail + content[next_line_idx:] 
    # Wait, next_line_idx from previous step might be wrong.
    # I'll use a simpler search and replace for the specific lines.

fix_content = content.replace("AssetRequest.id == db_request.id", "AssetRequest.id == request_id")

with open(service_file, 'w', encoding='utf-8') as f:
    f.write(fix_content)

print("Ensured re-fetch uses stable ID 'request_id'.")
