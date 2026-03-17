
from app.database.database import engine
from sqlalchemy import text

def check_remote():
    url = "postgresql+psycopg2://postgres:1234@192.168.0.83:5432/ITSM"
    from sqlalchemy import create_engine
    remote_engine = create_engine(url)
    print(f"Checking columns on 192.168.0.83...")
    with remote_engine.connect() as conn:
        res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_schema='auth' AND table_name='users'"))
        cols = [r[0] for r in res]
        print(f"Columns: {cols}")
        
        # Check constraints
        res = conn.execute(text("SELECT is_nullable FROM information_schema.columns WHERE table_schema='auth' AND table_name='users' AND column_name='username'"))
        row = res.fetchone()
        if row:
            print(f"Username nullable: {row[0]}")
            
        res = conn.execute(text("SELECT column_default FROM information_schema.columns WHERE table_schema='auth' AND table_name='users' AND column_name='created_at'"))
        row = res.fetchone()
        if row:
            print(f"Created_at default: {row[0]}")

if __name__ == "__main__":
    check_remote()
