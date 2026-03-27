import asyncio
from app.database.database import AsyncSessionLocal
from sqlalchemy import text

async def full_check():
    async with AsyncSessionLocal() as db:
        print("=== DATABASE INTEGRATION CHECK ===")
        try:
            # Check table columns and nullability
            print("\n1. Checking 'system.notifications' schema:")
            result = await db.execute(text("""
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_schema = 'system' AND table_name = 'notifications'
                ORDER BY ordinal_position
            """))
            columns = result.fetchall()
            for col in columns:
                print(f" - {col[0]}: {col[1]} (Nullable: {col[2]})")

            # Check for data
            print("\n2. Checking notification counts:")
            result = await db.execute(text("SELECT is_read, COUNT(*) FROM system.notifications GROUP BY is_read"))
            counts = result.fetchall()
            for row in counts:
                print(f" - Is Read: {row[0]}, Count: {row[1]}")

            # Check if source column exists (redundant but good)
            result = await db.execute(text("SELECT source FROM system.notifications LIMIT 1"))
            print(" - 'source' column is accessible.")

        except Exception as e:
            print(f"FAILED DATABASE CHECK: {e}")

        print("\n=== BACKEND ROUTER CHECK ===")
        # This is more of a code audit, but we can verify the API prefix if main app is importable
        from app.main import app
        found_notif = False
        for route in app.routes:
            if hasattr(route, "path") and "/notifications" in route.path:
                found_notif = True
                methods = route.methods if hasattr(route, "methods") else ["GET"]
                print(f" - Route: {route.path} [{', '.join(methods)}]")
        if not found_notif:
            print(" - WARNING: /notifications routes not found in main app!")

if __name__ == "__main__":
    asyncio.run(full_check())
