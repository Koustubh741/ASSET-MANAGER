"""
Migration: Create asset.gate_passes table
Run this once against your PostgreSQL database.

Usage:
  cd d:\ASSET-MANAGER\backend
  python scripts\create_gate_pass_table.py
"""
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/assetmanager")

CREATE_SQL = """
CREATE TABLE IF NOT EXISTS asset.gate_passes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id    UUID NOT NULL REFERENCES asset.assets(id) ON DELETE CASCADE,

    issued_to   VARCHAR(255) NOT NULL,
    issued_by   VARCHAR(255) NOT NULL,
    approved_by VARCHAR(255),

    reason      TEXT NOT NULL,
    destination VARCHAR(255),
    valid_until TIMESTAMPTZ,

    status      VARCHAR(50) NOT NULL DEFAULT 'PENDING',

    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_gate_passes_asset_id ON asset.gate_passes(asset_id);
CREATE INDEX IF NOT EXISTS ix_gate_passes_status   ON asset.gate_passes(status);
"""

async def main():
    import asyncpg
    # Strip the "+asyncpg" driver prefix for direct asyncpg use
    url = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(url)
    try:
        await conn.execute(CREATE_SQL)
        print("✅ asset.gate_passes table created (or already exists).")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
