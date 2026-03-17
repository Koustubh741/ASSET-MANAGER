from app.database.database import engine, test_connection
from sqlalchemy import text
import time

print('Test connection:', test_connection())

try:
    with engine.connect() as conn:
        start = time.time()
        res = conn.execute(text('SELECT count(*) FROM asset.assets'))
        count = res.fetchone()[0]
        elapsed = time.time() - start
        print('Count:', count)
        print('Elapsed:', elapsed)
except Exception as e:
    print('DB query error:', e)
