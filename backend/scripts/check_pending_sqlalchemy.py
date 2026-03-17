from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.models import User
import os
from dotenv import load_dotenv

load_dotenv()

def check_pending_sqlalchemy():
    url = os.getenv('DATABASE_URL')
    if "asyncpg" in url:
        url = url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
    
    engine = create_engine(url)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    pending_users = session.query(User).filter(User.status == 'PENDING').all()
    print(f"Pending Users found via SQLAlchemy: {len(pending_users)}")
    for u in pending_users:
        print(f"- {u.email} ({u.status})")
    
    session.close()

if __name__ == "__main__":
    check_pending_sqlalchemy()
