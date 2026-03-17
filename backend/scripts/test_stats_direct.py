"""
Direct test of the stats query to see where it's hanging
"""
from app.database.database import SessionLocal
from sqlalchemy import func, text
import models
import time

def test_stats_queries():
    print("\n=== TESTING STATS QUERIES DIRECTLY ===\n")
    db = SessionLocal()
    
    try:
        # Test 1: Basic count
        print("Test 1: Total asset count...")
        start = time.time()
        total = db.query(models.Asset).count()
        elapsed = time.time() - start
        print(f"✅ Total assets: {total} (took {elapsed:.2f}s)")
        
        # Test 2: Status filter  
        print("\nTest 2: Active assets count...")
        start = time.time()
        active = db.query(models.Asset).filter(models.Asset.status.ilike("Active")).count()
        elapsed = time.time() - start
        print(f"✅ Active assets: {active} (took {elapsed:.2f}s)")
        
        # Test 3: Group by status
        print("\nTest 3: Group by status...")
        start = time.time()
        by_status = db.query(models.Asset.status, func.count(models.Asset.id)).group_by(models.Asset.status).all()
        elapsed = time.time() - start
        print(f"✅ By status: {by_status} (took {elapsed:.2f}s)")
        
        # Test 4: Group by category
        print("\nTest 4: Group by category...")
        start = time.time()
        by_segment = db.query(models.Asset.category, func.count(models.Asset.id)).group_by(models.Asset.category).all()
        elapsed = time.time() - start
        print(f"✅ By category: {by_segment} (took {elapsed:.2f}s)")
        
        print("\n✅ ALL QUERIES COMPLETED SUCCESSFULLY!")
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_stats_queries()
