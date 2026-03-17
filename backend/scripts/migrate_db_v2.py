
from sqlalchemy import text
from app.database.database import engine

def migrate():
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            print("Dropping foreign keys...")
            # Drop FKs referencing asset.assets.id
            conn.execute(text("ALTER TABLE asset.asset_assignments DROP CONSTRAINT IF EXISTS asset_assignments_asset_id_fkey"))
            conn.execute(text("ALTER TABLE asset.maintenance DROP CONSTRAINT IF EXISTS maintenance_asset_id_fkey"))
            
            print("Altering column types...")
            # Change types
            conn.execute(text("ALTER TABLE asset.assets ALTER COLUMN id TYPE VARCHAR(255) USING id::text"))
            conn.execute(text("ALTER TABLE asset.asset_assignments ALTER COLUMN asset_id TYPE VARCHAR(255) USING asset_id::text"))
            conn.execute(text("ALTER TABLE asset.maintenance ALTER COLUMN asset_id TYPE VARCHAR(255) USING asset_id::text"))
            
            print("Re-adding foreign keys...")
            # Re-add FKs
            conn.execute(text("ALTER TABLE asset.asset_assignments ADD CONSTRAINT asset_assignments_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES asset.assets(id)"))
            conn.execute(text("ALTER TABLE asset.maintenance ADD CONSTRAINT maintenance_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES asset.assets(id)"))
            
            trans.commit()
            print("Migration successful!")
        except Exception as e:
            trans.rollback()
            print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
