import os
import sys
from sqlalchemy import create_engine, text, inspect
from dotenv import load_dotenv

# Add backend to path for imports if needed, though we use direct SQL for robustness
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not found in .env")
    sys.exit(1)

SYNC_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
engine = create_engine(SYNC_URL)

def sync_db():
    inspector = inspect(engine)
    
    with engine.connect() as conn:
        print("Starting Enterprise Patch DB Sync...")
        
        # 1. Update system_patches
        columns = [c['name'] for c in inspector.get_columns('system_patches', schema='asset')]
        if 'kb_article_id' not in columns:
            print("Adding kb_article_id to system_patches...")
            conn.execute(text("ALTER TABLE asset.system_patches ADD COLUMN kb_article_id VARCHAR(50)"))
        if 'superseded_by_id' not in columns:
            print("Adding superseded_by_id to system_patches...")
            conn.execute(text("ALTER TABLE asset.system_patches ADD COLUMN superseded_by_id UUID REFERENCES asset.system_patches(id)"))
        
        # 2. Update patch_schedules
        columns = [c['name'] for c in inspector.get_columns('patch_schedules', schema='asset')]
        if 'window_start' not in columns:
            print("Adding window_start to patch_schedules...")
            conn.execute(text("ALTER TABLE asset.patch_schedules ADD COLUMN window_start TIMESTAMP WITH TIME ZONE"))
        if 'window_end' not in columns:
            print("Adding window_end to patch_schedules...")
            conn.execute(text("ALTER TABLE asset.patch_schedules ADD COLUMN window_end TIMESTAMP WITH TIME ZONE"))

        # 3. Create patch_deployment_jobs
        if not inspector.has_table('patch_deployment_jobs', schema='asset'):
            print("Creating patch_deployment_jobs table...")
            conn.execute(text("""
                CREATE TABLE asset.patch_deployment_jobs (
                    id UUID PRIMARY KEY,
                    patch_id UUID NOT NULL REFERENCES asset.system_patches(id),
                    created_by UUID NOT NULL REFERENCES auth.users(id),
                    target_criteria JSONB NOT NULL,
                    total_assets INTEGER DEFAULT 0,
                    completed_assets INTEGER DEFAULT 0,
                    failed_assets INTEGER DEFAULT 0,
                    status VARCHAR(50) DEFAULT 'QUEUED',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    completed_at TIMESTAMP WITH TIME ZONE
                )
            """))
            conn.execute(text("CREATE INDEX ix_patch_deployment_jobs_status ON asset.patch_deployment_jobs(status)"))
        
        # 4. Create patch_logs
        if not inspector.has_table('patch_logs', schema='asset'):
            print("Creating patch_logs table...")
            conn.execute(text("""
                CREATE TABLE asset.patch_logs (
                    id UUID PRIMARY KEY,
                    deployment_id UUID NOT NULL REFERENCES asset.patch_deployments(id),
                    asset_id UUID NOT NULL REFERENCES asset.assets(id),
                    level VARCHAR(20) DEFAULT 'INFO',
                    message TEXT NOT NULL,
                    stdout TEXT,
                    stderr TEXT,
                    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            """))
            conn.execute(text("CREATE INDEX ix_patch_logs_deployment_id ON asset.patch_logs(deployment_id)"))
            conn.execute(text("CREATE INDEX ix_patch_logs_asset_id ON asset.patch_logs(asset_id)"))
        
        conn.commit()
        print("Enterprise Patch DB Sync Completed Successfully.")

if __name__ == "__main__":
    sync_db()
