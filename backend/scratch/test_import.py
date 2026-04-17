import importlib, sys

# Force clean load — remove any cached version
for key in list(sys.modules.keys()):
    if 'asset_service' in key:
        del sys.modules[key]

try:
    import app.services.asset_service as svc
    print("MODULE LOADED OK")
    print("get_asset_events present:", hasattr(svc, 'get_asset_events'))
    print("All functions:")
    fns = [k for k in dir(svc) if callable(getattr(svc, k)) and not k.startswith('_')]
    for f in fns:
        print(f"  - {f}")
except Exception as e:
    print(f"IMPORT FAILED: {e}")
    import traceback
    traceback.print_exc()
