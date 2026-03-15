from pysnmp.hlapi.asyncio import ContextData
import asyncio

async def test():
    print("Testing ContextData with bytes...")
    try:
        ctx_bytes = b"vlan100"
        c3 = ContextData(contextName=ctx_bytes)
        print(f"ContextData(contextName={ctx_bytes!r}) -> Name type: {type(c3.contextName)}, Value: {c3.contextName!r}")
    except Exception as e:
        print(f"Error bytes: {e}")

if __name__ == "__main__":
    asyncio.run(test())
