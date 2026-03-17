import sys
import os
sys.path.append(os.path.join(os.getcwd(), "app"))

from app.services import pdf_extraction_service

pdf_path = r'uploads/procurement/PO_685a0b71-78fd-45ab-b28e-bd5ab7c01037_d9c9acae-4ce5-4b43-b15d-bcc87c87b75a.pdf'

print("Running PDF extraction with debug mode...")
print("="*80)

result = pdf_extraction_service.extract_po_details(pdf_path, debug=True)

print("\n" + "="*80)
print("FINAL RESULT:")
print("="*80)
for key, value in result.items():
    print(f"{key:20s}: {value}")
