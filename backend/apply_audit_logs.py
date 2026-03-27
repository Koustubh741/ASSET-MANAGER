import os

path = r'd:\ASSET-MANAGER\backend\app\routers\patch_management.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. deploy_patch (approx line 140)
old_deploy = """    dep.last_check_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(dep)"""
new_deploy = """    dep.last_check_at = datetime.now(timezone.utc)
    await db.commit()
    # Audit Log
    db.add(AuditLog(
        id=uuid.uuid4(),
        user_id=user.id,
        action="PATCH_DEPLOY",
        target_type="ASSET",
        target_id=deployment.asset_id,
        details=f"Deployed patch {patch.patch_id} to asset {deployment.asset_id}"
    ))
    await db.commit()
    await db.refresh(dep)"""

if old_deploy in content:
    content = content.replace(old_deploy, new_deploy, 1) # Only first occurrence
    print("Injected AuditLog into deploy_patch")

# 2. retry_patch (approx line 413)
old_retry = """    dep.last_check_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(dep)
    dep.patch_title = patch.title if patch else None"""
new_retry = """    dep.last_check_at = datetime.now(timezone.utc)
    await db.commit()
    # Audit Log
    db.add(AuditLog(
        id=uuid.uuid4(),
        user_id=user.id,
        action="PATCH_RETRY",
        target_type="DEPLOYMENT",
        target_id=dep.id,
        details=f"Retried failed patch {dep.patch_id} on asset {dep.asset_id}"
    ))
    await db.commit()
    await db.refresh(dep)
    dep.patch_title = patch.title if patch else None"""

if old_retry in content:
    content = content.replace(old_retry, new_retry)
    print("Injected AuditLog into retry_patch")

# 3. rollback_patch (approx line 447)
old_rollback = """    dep.last_check_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(dep)
    dep.patch_title = patch.title if patch else None"""
# This one will likely match retry_patch too if I'm not careful. 
# But let's check the context for rollback specifically.
# Wait, rollback has command="ROLLBACK_PATCH" above it.

if 'command="ROLLBACK_PATCH"' in content:
    old_rb = """    dep.last_check_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(dep)
    dep.patch_title = patch.title if patch else None
    return dep"""
    new_rb = """    dep.last_check_at = datetime.now(timezone.utc)
    await db.commit()
    # Audit Log
    db.add(AuditLog(
        id=uuid.uuid4(),
        user_id=user.id,
        action="PATCH_ROLLBACK",
        target_type="DEPLOYMENT",
        target_id=dep.id,
        details=f"Initiated rollback for patch {dep.patch_id} on asset {dep.asset_id}"
    ))
    await db.commit()
    await db.refresh(dep)
    dep.patch_title = patch.title if patch else None
    return dep"""
    if old_rb in content:
        content = content.replace(old_rb, new_rb)
        print("Injected AuditLog into rollback_patch")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
