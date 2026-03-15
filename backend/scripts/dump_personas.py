import asyncio, sys
sys.path.insert(0, '.')
from dotenv import load_dotenv; load_dotenv()
from app.database.database import AsyncSessionLocal
from sqlalchemy import text

async def get_personas():
    async with AsyncSessionLocal() as db:
        r = await db.execute(text(
            "SELECT email, full_name, role, department FROM auth.users "
            "WHERE role IN ('SYSTEM_ADMIN', 'ADMIN', 'IT_MANAGEMENT', 'FINANCE', 'ASSET_INVENTORY_MANAGER', 'ASSET_MANAGER', 'PROCUREMENT', 'MANAGER', 'END_USER') "
            "ORDER BY role"
        ))
        rows = r.fetchall()
        print("| Name | Email | Role | Department |")
        print("| :--- | :--- | :--- | :--- |")
        for row in rows:
            print(f"| {row[1]} | {row[0]} | {row[2]} | {row[3]} |")

if __name__ == "__main__":
    asyncio.run(get_personas())
