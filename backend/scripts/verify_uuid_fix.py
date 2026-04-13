"""
UUIDv7 Migration - Final Verification Test
Run: python scripts/verify_uuid_fix.py
"""
import sys, os, time, subprocess
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

results = {}

# T1: Import
print("\n[T1] Importing from uuid_gen...")
from app.utils.uuid_gen import get_uuid, get_uuid_str
results['Import uuid_gen'] = True
print("     PASS")

# T2: All IDs are version 7
print("\n[T2] Checking UUID version = 7 ...")
ids = [get_uuid() for _ in range(5)]
for i, u in enumerate(ids):
    print(f"     ID-{i+1}: {u}  v={u.version}")
results['All IDs are v7'] = all(u.version == 7 for u in ids)
print("     PASS" if results['All IDs are v7'] else "     FAIL")

# T3: Sequential / lexicographic order
print("\n[T3] Checking sequential (time-ordered) sort ...")
batch = []
for _ in range(8):
    batch.append(get_uuid())
    time.sleep(0.002)
results['Sequential order'] = (batch == sorted(batch))
print("     PASS" if results['Sequential order'] else "     FAIL")

# T4: No import shadowing
print("\n[T4] Checking uuid_utils library is not shadowed ...")
import uuid_utils
u7 = uuid_utils.uuid7()
results['No shadowing'] = (u7.version == 7)
print(f"     uuid_utils.uuid7() = {u7}  v={u7.version}")
print("     PASS" if results['No shadowing'] else "     FAIL")

# T5: Model defaults point to uuid_gen.get_uuid
print("\n[T5] Checking SQLAlchemy model defaults ...")
from app.models.models import Asset, AuditLog, Ticket, User
for name, model in [('Asset', Asset), ('AuditLog', AuditLog), ('Ticket', Ticket), ('User', User)]:
    fn = model.__table__.c['id'].default.arg
    fn_name = getattr(fn, '__name__', '')
    fn_mod  = getattr(fn, '__module__', '')
    ok = (fn_name == 'get_uuid') and ('uuid_gen' in fn_mod)
    results[f'{name}.id uses uuid_gen.get_uuid'] = ok
    print(f"     {'PASS' if ok else 'FAIL'}  {name}.id -> {fn_name} ({fn_mod})")

# T6: No old uuid_utils imports remain
print("\n[T6] Scanning for leftover 'uuid_utils' imports ...")
app_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'app')
old_refs = []
for root, dirs, files in os.walk(app_dir):
    for f in files:
        if not f.endswith('.py'):
            continue
        fp = os.path.join(root, f)
        with open(fp, encoding='utf-8', errors='ignore') as fh:
            for lineno, line in enumerate(fh, 1):
                if 'from ..utils.uuid_utils' in line or 'from app.utils.uuid_utils' in line:
                    old_refs.append(f"{fp}:{lineno}: {line.strip()}")
results['No old uuid_utils imports'] = (len(old_refs) == 0)
if old_refs:
    for r in old_refs:
        print(f"     FAIL  {r}")
else:
    print("     PASS  No old imports found")

# Final summary
print()
print("=" * 55)
print("  UUIDv7 Migration - Verification Summary")
print("=" * 55)
passed = 0
for test, ok in results.items():
    label = "PASS" if ok else "FAIL"
    print(f"  [{label}]  {test}")
    if ok:
        passed += 1
total = len(results)
print("=" * 55)
print(f"  {passed}/{total} checks passed")
if passed == total:
    print("  >> ALL CHECKS PASSED - UUIDv7 migration verified!")
else:
    print("  >> SOME CHECKS FAILED - review output above.")
print("=" * 55)
sys.exit(0 if passed == total else 1)
