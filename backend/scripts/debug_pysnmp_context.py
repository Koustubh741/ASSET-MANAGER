from pysnmp.hlapi.asyncio import ContextData
import asyncio

async def test():
    print("Testing ContextData...")
    try:
        # Test positional arg (historically EngineID)
        c1 = ContextData("vlan100")
        print(f"ContextData('vlan100') -> EngineID: {c1.contextEngineId!r}, Name: {c1.contextName!r}")
    except Exception as e:
        print(f"Error positional: {e}")
    
    try:
        # Test keyword arg
        c2 = ContextData(contextName='vlan100')
        print(f"ContextData(contextName='vlan100') -> EngineID: {c2.contextEngineId!r}, Name: {c2.contextName!r}")
    except Exception as e:
        print(f"Error keyword: {e}")

if __name__ == "__main__":
    asyncio.run(test())
