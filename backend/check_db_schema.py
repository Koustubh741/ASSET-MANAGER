import asyncio
import os
import sys

# Add the backend directory to sys.path
sys.path.append(os.getcwd())

from app.database.database import engine
from sqlalchemy import inspect

async def check():
    def get_cols():
        inspect_obj = inspect(engine)
        columns = inspect_obj.get_columns('users', schema='auth')
        return [c['name'] for c in columns]
    
    # Run in thread since inspect is synchronous
    loop = asyncio.get_event_loop()
    cols = await loop.run_in_executor(None, get_cols)
    print(f"Columns in auth.users: {cols}")

if __name__ == "__main__":
    asyncio.run(check())
