import sys
import os
from sqlalchemy import text

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.database import engine

def create_table_simple():
    try:
        with engine.begin() as conn:  # Transactional block
            # Ensure schemas exist
            conn.execute(text("CREATE SCHEMA IF NOT EXISTS asset;"))
            conn.execute(text("CREATE SCHEMA IF NOT EXISTS auth;"))
            conn.execute(text("CREATE SCHEMA IF NOT EXISTS procurement;"))
            conn.execute(text("CREATE SCHEMA IF NOT EXISTS audit;"))
            conn.execute(text("CREATE SCHEMA IF NOT EXISTS support;"))
            conn.execute(text("CREATE SCHEMA IF NOT EXISTS exit;"))
            conn.execute(text("CREATE SCHEMA IF NOT EXISTS system;"))

            print("Creating audit.procurement_logs...")
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
            print("Done.")

            print("Creating procurement.purchase_orders...")
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
            print("Done.")
            
            print("Creating procurement.purchase_invoices...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS procurement.purchase_invoices (
                    id UUID PRIMARY KEY,
                    purchase_order_id UUID NOT NULL,
                    invoice_pdf_path VARCHAR(500) NOT NULL,
                    purchase_date TIMESTAMP,
                    total_amount FLOAT,
                    created_by VARCHAR NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
                );
            """))
            print("Done.")
            
        print("ALL TABLES CREATED SUCCESSFULLY.")
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    create_table_simple()
