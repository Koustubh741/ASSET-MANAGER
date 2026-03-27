import asyncio
import httpx

async def check():
    async with httpx.AsyncClient() as client:
        # 1. Get Internal
        res_int = await client.get("http://127.0.0.1:8000/api/v1/tickets/?is_internal=true")
        if res_int.status_code != 200:
            print(f"Error Int: {res_int.text}")
            return
        data_int = res_int.json()
        ids_int = set(t['id'] for t in data_int)
        
        # 2. Get External
        res_ext = await client.get("http://127.0.0.1:8000/api/v1/tickets/?is_internal=false")
        if res_ext.status_code != 200:
            print(f"Error Ext: {res_ext.text}")
            return
        data_ext = res_ext.json()
        ids_ext = set(t['id'] for t in data_ext)
        
        overlap = ids_int.intersection(ids_ext)
        print(f"Internal IDs: {len(ids_int)}")
        print(f"External IDs: {len(ids_ext)}")
        print(f"Overlap: {len(overlap)}")
        if overlap:
            print(f"Overlap IDs: {list(overlap)}")

if __name__ == "__main__":
    asyncio.run(check())
