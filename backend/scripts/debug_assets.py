import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.services import asset_service
import traceback

try:
    assets = asset_service.get_all_assets()
    print(f"Successfully fetched {len(assets)} assets")
except Exception as e:
    print("Caught exception:")
    traceback.print_exc()
