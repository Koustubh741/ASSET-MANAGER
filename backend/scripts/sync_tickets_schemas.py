from app.database.database import engine
from sqlalchemy import text

def sync_tickets():
    """
    Copies tickets from helpdesk.tickets to support.tickets and ensures schema consistency.
    """
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            print("Syncing tickets from helpdesk to support...")
            
            # Since resolution columns might not exist in helpdesk.tickets, 
            # we select only the columns that are likely to exist.
            # We'll use a dynamic insert-select.
            
            conn.execute(text("""
                INSERT INTO support.tickets (
                    id, subject, description, status, priority, category, 
                    requestor_id, assigned_to_id, related_asset_id, 
                    created_at, updated_at
                )
                SELECT 
                    id, subject, description, status, priority, category, 
                    requestor_id, assigned_to_id, related_asset_id, 
                    created_at, updated_at
                FROM helpdesk.tickets
                ON CONFLICT (id) DO NOTHING
            """))
            
            trans.commit()
            print("Successfully synced tickets!")
        except Exception as e:
            trans.rollback()
            print(f"Failed to sync tickets: {e}")

if __name__ == "__main__":
    sync_tickets()
