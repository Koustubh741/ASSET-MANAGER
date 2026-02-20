"""
Migration script to add workflow completion fields to asset_requests table
Run this after updating models.py
"""
from app.database.database import engine
from sqlalchemy import text

def migrate_workflow_completion():
    """Add new workflow fields to asset_requests table"""
    try:
        with engine.connect() as connection:
            print("\n=== MIGRATING ASSET_REQUESTS FOR WORKFLOW COMPLETION ===\n")
            
            # Remove deprecated it_review_status column (keep it_reviewed_by and it_reviewed_at for audit)
            # Note: We keep it_reviewed_by and it_reviewed_at for audit trail
            
            # Add Procurement/Finance segment fields
            columns_to_add = [
                ("procurement_finance_status", "VARCHAR(50)"),
                ("procurement_finance_reviewed_by", "VARCHAR"),
                ("procurement_finance_reviewed_at", "TIMESTAMP WITH TIME ZONE"),
                ("procurement_finance_rejection_reason", "TEXT"),
                # QC fields
                ("qc_status", "VARCHAR(50)"),
                ("qc_performed_by", "VARCHAR"),
                ("qc_performed_at", "TIMESTAMP WITH TIME ZONE"),
                ("qc_notes", "TEXT"),
                # User acceptance fields
                ("user_acceptance_status", "VARCHAR(50)"),
                ("user_accepted_at", "TIMESTAMP WITH TIME ZONE"),
            ]
            
            for col_name, col_type in columns_to_add:
                try:
                    # Check if column already exists
                    check_query = text(f"""
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_schema = 'asset' 
                        AND table_name = 'asset_requests' 
                        AND column_name = '{col_name}'
                    """)
                    result = connection.execute(check_query)
                    if result.fetchone():
                        print(f"[SKIP] Column '{col_name}' already exists")
                    else:
                        connection.execute(text(f"""
                            ALTER TABLE asset.asset_requests 
                            ADD COLUMN {col_name} {col_type}
                        """))
                        connection.commit()
                        print(f"[OK] Added '{col_name}' column")
                except Exception as e:
                    print(f"[WARNING] Could not add '{col_name}' column: {e}")
            
            # Note: We do NOT drop it_review_status column to maintain backward compatibility
            # It will simply not be used going forward - status field is the source of truth
            
            print("\n[OK] Workflow completion migration complete!")
            print("\n[NOTE] it_review_status column retained for backward compatibility")
            print("       All new workflows use the unified 'status' field")
            
    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    migrate_workflow_completion()

