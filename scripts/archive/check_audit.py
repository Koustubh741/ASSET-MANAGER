import asyncio
import json
from sqlalchemy import select
from backend.app.database.database import AsyncSessionLocal
from sqlalchemy import text

async def check_audit():
    async with AsyncSessionLocal() as session:
        # Check audit logs
        result = await session.execute(
            text("SELECT action, details, created_at FROM audit.audit_logs ORDER BY created_at DESC LIMIT 5")
        )
        logs = result.fetchall()
        print("Latest Audit Logs:")
        for log in logs:
            print(f"[{log[2]}] Action: {log[0]}")
            print(f"Details: {json.dumps(log[1], indent=2)}")
            print("-" * 20)

if __name__ == "__main__":
    asyncio.run(check_audit())
