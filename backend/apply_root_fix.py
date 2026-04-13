import asyncio
import sys
import os

# Add the current directory (backend/) to sys.path for internal imports
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.database.database import AsyncSessionLocal
from app.services.asset_request_service import apply_root_fix
from app.services.automation_service import AutomationService

async def main():
    print("\n" + "="*60)
    print("      STARTING THE ROOT FIX (UNIVERSAL STABILIZATION)      ")
    print("="*60 + "\n")
    
    async with AsyncSessionLocal() as db:
        # 1. Sync Asset Assignments & Request States
        print("Step 1: Synchronizing Asset Assignments & Request States...")
        result = await apply_root_fix(db)
        print(f"        -> COMPLETED. Updated: {result.get('updated', 0)} records.")
        if result.get('errors'):
            print(f"        -> WARNING: Encountered {len(result['errors'])} errors during sync.")
            for err in result['errors'][:5]: # Show first 5 errors
                print(f"           - {err}")

        # 2. Recalculate Open SLAs
        print("\nStep 2: Recalculating Open Ticket SLAs...")
        # Note: This recalibrates all open tickets to ensure they respect the latest policies
        await AutomationService.recalculate_open_ticket_slas(db)
        print("        -> COMPLETED.")

        print("\n" + "="*60)
        print("             ROOT FIX APPLIED SUCCESSFULLY              ")
        print("="*60 + "\n")

if __name__ == "__main__":
    # Ensure we run from the backend root if possible
    asyncio.run(main())
