import asyncio
from app.services.discovery_service import process_discovery_payload
from app.utils.auth_utils import get_current_user
from fastapi import Request
import inspect

async def audit_logic():
    print("=== LOGIC AUDIT ===")
    
    # Check if discovery_service calls create_notification
    import app.services.discovery_service as ds
    source_code = inspect.getsource(ds.process_discovery_payload)
    if "create_notification" in source_code:
        print(" - discovery_service.py correctly calls create_notification.")
    else:
        print(" - WARNING: discovery_service.py missing create_notification call!")

    # Check auth_utils for token query param
    import app.utils.auth_utils as au
    source_code = inspect.getsource(au.get_current_user)
    if 'Query(None, alias="token")' in source_code or 'token: str = Query(None)' in source_code:
        print(" - auth_utils.py correctly handles token query parameter for SSE.")
    else:
        print(" - WARNING: auth_utils.py might not handle token query parameter!")

if __name__ == "__main__":
    asyncio.run(audit_logic())
