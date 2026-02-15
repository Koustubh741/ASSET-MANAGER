import sqlite3
import os

# Assuming SQLite for simple local dev, BUT user said postgresql in previous context summaries.
# Wait, user_information says "The user has 1 active workspaces...".
# Let's check database.py to see what DB is used.
# If it's SQLite, I can use sqlite3. If PostgreSQL, I need psycopg2 or sqlalchemy.
# I'll use sqlalchemy to be safe as models.py uses it.

from app.database.database import SessionLocal, engine
from sqlalchemy import text
from app.models.models import User

def add_company_column():
    print("Checking database type...")
    # Attempt to use raw SQL via engine
    with engine.connect() as conn:
        try:
            # Check if column exists first (PostgreSQL)
            # For SQLite: PRAGMA table_info(users);
            # For Postgres: select column_name from information_schema.columns where table_name='users' and column_name='company';
            
            print("Attempting to add column 'company' to 'users' table...")
            # This SQL is generally compatible with both SQLite and Postgres for ADD COLUMN
            conn.execute(text("ALTER TABLE users ADD COLUMN company VARCHAR(255)"))
            conn.commit()
            print("Column 'company' added successfully.")
        except Exception as e:
            print(f"Migration might have failed or column already exists: {e}")

def update_users_company():
    print("Updating existing users...")
    db = SessionLocal()
    try:
        users = db.query(User).all()
        for user in users:
            # Set default company
            user.company = "Cache Digitech" 
            print(f"Updated user {user.full_name} ({user.role}) company to {user.company}")
        db.commit()
        print("Users updated successfully.")
    except Exception as e:
        print(f"Failed to update users: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_company_column()
    update_users_company()
