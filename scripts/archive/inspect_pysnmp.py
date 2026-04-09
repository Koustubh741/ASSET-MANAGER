
try:
    from pysnmp.hlapi.asyncio import *
    import pysnmp.hlapi.asyncio as hlapi
    
    print("--- Pysnmp Auth Protocols ---")
    for name in dir(hlapi):
        if 'AuthProtocol' in name:
            print(name)
            
    print("\n--- Pysnmp Priv Protocols ---")
    for name in dir(hlapi):
        if 'PrivProtocol' in name:
            print(name)
except Exception as e:
    print(f"Error: {e}")
