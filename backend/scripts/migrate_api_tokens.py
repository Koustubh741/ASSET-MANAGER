"""
Migration script to create api_tokens table
"""
import sys
import os

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import engine
from sqlalchemy import text

def migrate():
    print("=== CREATING API_TOKENS TABLE ===")
    
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS system.api_tokens (
        id VARCHAR PRIMARY KEY,
        token VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        created_by VARCHAR,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE,
        last_used_at TIMESTAMP WITH TIME ZONE
    );
    
    CREATE INDEX IF NOT EXISTS ix_system_api_tokens_id ON system.api_tokens (id);
    CREATE INDEX IF NOT EXISTS ix_system_api_tokens_token ON system.api_tokens (token);
    """
    
    with engine.connect() as connection:
        try:
            connection.execute(text(create_table_sql))
            connection.commit()
            print("✓ Successfully created 'system.api_tokens' table.")
        except Exception as e:
            print(f"✗ Error creating table: {e}")

if __name__ == "__main__":
    migrate()
