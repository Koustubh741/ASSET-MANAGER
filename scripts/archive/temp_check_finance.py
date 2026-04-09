from backend.app.database.database import get_db, engine
from backend.app.models.models import AssetRequest
from sqlalchemy.future import select
import asyncio
import json

def check_finance_pending():
    with engine.connect() as conn:
        result = conn.execute(select(AssetRequest).where(AssetRequest.procurement_finance_status == 'PO_VALIDATED'))
        requests = result.fetchall()
        
        print(f"Pending for Finance: {len(requests)}")
        for r in requests:
            print(dict(r._mapping))

if __name__ == "__main__":
    check_finance_pending()
