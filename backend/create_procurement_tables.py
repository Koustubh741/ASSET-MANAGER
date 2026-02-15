import sys
import os
from sqlalchemy import text

# Add root directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.database import engine

def create_tables():
    try:
        with engine.connect() as conn:
            # Create Schemas
            conn.execute(text("CREATE SCHEMA IF NOT EXISTS audit"))
            conn.execute(text("CREATE SCHEMA IF NOT EXISTS procurement"))
            
            # Create Procurement Logs
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS audit.procurement_logs (
                    id UUID PRIMARY KEY,
                    reference_id UUID NOT NULL,
                    action VARCHAR(50) NOT NULL,
                    performed_by VARCHAR NOT NULL,
                    role VARCHAR(50),
                    metadata_ JSONB,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_audit_procurement_logs_id ON audit.procurement_logs (id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_audit_procurement_logs_reference_id ON audit.procurement_logs (reference_id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_audit_procurement_logs_action ON audit.procurement_logs (action)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_audit_procurement_logs_performed_by ON audit.procurement_logs (performed_by)"))

            # Create Purchase Orders
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS procurement.purchase_orders (
                    id UUID PRIMARY KEY,
                    asset_request_id UUID NOT NULL,
                    uploaded_by VARCHAR NOT NULL,
                    po_pdf_path VARCHAR(500) NOT NULL,
                    vendor_name VARCHAR(255),
                    product_details JSONB,
                    quantity FLOAT,
                    unit_price FLOAT,
                    total_cost FLOAT,
                    expected_delivery_date TIMESTAMP,
                    extracted_data JSONB,
                    status VARCHAR(50) DEFAULT 'UPLOADED',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_procurement_purchase_orders_id ON procurement.purchase_orders (id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_procurement_purchase_orders_asset_request_id ON procurement.purchase_orders (asset_request_id)"))

            # Create Purchase Invoices
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS procurement.purchase_invoices (
                    id UUID PRIMARY KEY,
                    purchase_order_id UUID NOT NULL,
                    invoice_pdf_path VARCHAR(500) NOT NULL,
                    purchase_date TIMESTAMP,
                    total_amount FLOAT,
                    created_by UUID NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
                );
            """))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_procurement_purchase_invoices_id ON procurement.purchase_invoices (id)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS ix_procurement_purchase_invoices_purchase_order_id ON procurement.purchase_invoices (purchase_order_id)"))
            
            conn.commit()
            print("Tables created manually via script.")
    except Exception as e:
        print(f"Error creating tables: {e}")

if __name__ == "__main__":
    create_tables()
