import os

path = r'd:\ASSET-MANAGER\backend\app\routers\patch_management.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the typo in rollback_patch where it says PATCH_RETRY
# It appears after cmd = AgentCommand(...) where command="ROLLBACK_PATCH"
target_block = """    # Audit Log
    db.add(AuditLog(
        id=uuid.uuid4(),
        user_id=user.id,
        action="PATCH_RETRY",
        target_type="DEPLOYMENT",
        target_id=dep.id,
        details=f"Retried failed patch {dep.patch_id} on asset {dep.asset_id}"
    ))"""

replacement_block = """    # Audit Log
    db.add(AuditLog(
        id=uuid.uuid4(),
        user_id=user.id,
        action="PATCH_ROLLBACK",
        target_type="DEPLOYMENT",
        target_id=dep.id,
        details=f"Initiated rollback for patch {dep.patch_id} on asset {dep.asset_id}"
    ))"""

if target_block in content:
    # There might be two instances of this block (one in retry, one in rollback)
    # The rollback one is the LAST one in the file because it was added last.
    # Or I can use more context.
    
    rb_context = 'command="ROLLBACK_PATCH"'
    # Split content by the context
    parts = content.split(rb_context)
    if len(parts) > 1:
        # The target block is in the second part
        parts[1] = parts[1].replace(target_block, replacement_block, 1)
        content = rb_context.join(parts)
        print("Fixed AuditLog typo in rollback_patch")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
