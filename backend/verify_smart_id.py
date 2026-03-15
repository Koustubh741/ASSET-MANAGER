import sys
import os

# Root path alignment for standalone and workspace execution
# Ensures 'app' package is found regardless of whether run from backend/ or project root
ABS_PATH = os.path.dirname(os.path.abspath(__file__))
if ABS_PATH not in sys.path:
    sys.path.insert(0, ABS_PATH)

# Add parent to path for IDEs looking at the project root
PARENT_DIR = os.path.dirname(ABS_PATH)
if PARENT_DIR not in sys.path:
    sys.path.append(PARENT_DIR)

from sqlalchemy.orm import joinedload
from app.database.database import SessionLocal
from app.models.models import Ticket, User

def verify_ticket_id(id_prefix):
    """
    Verifies the Smart ID generation for a ticket given its UUID prefix.
    Aligns with the Identifier Anatomy Guide: DEPT-TARGET-YYMMDD-HASH
    """
    db = SessionLocal()
    try:
        # Fetch tickets with join for accuracy
        query = db.query(Ticket).options(joinedload(Ticket.requestor))
        result = query.all()
        
        matches = [t for t in result if str(t.id).lower().startswith(id_prefix.lower())]
        
        if not matches:
            print(f"No ticket found matching ID prefix: {id_prefix}")
            return

        print(f"\n--- Smart ID Verification Results (Matches: {len(matches)}) ---")
        for t in matches:
            # 1. Determine Department (DEPT)
            dept = "Unknown"
            if t.requestor:
                dept = t.requestor.department or t.requestor.domain or "SYS"
            s_dept = str(dept)[:3].upper()

            # 2. Determine Asset Letter (Part of TARGET)
            asset_letter = get_asset_letter(t.category, t.subject)

            # 3. Determine Priority (Part of TARGET)
            s_prio = "2" # Medium Default
            prio_upper = str(t.priority).upper()
            if prio_upper == "HIGH": s_prio = "1"
            elif prio_upper == "LOW": s_prio = "3"

            # 4. Date Segment (YYMMDD)
            s_date = t.created_at.strftime("%y%m%d")

            # 5. Hash Segment (First 4 of UUID)
            # Simplified to avoid slice type-check issues on multi-step splits
            full_uuid = str(t.id)
            s_hash = full_uuid[0:4].upper()

            # Final Assembly
            calculated_id = f"{s_dept}-{asset_letter}{s_prio}-{s_date}-{s_hash}"

            print(f"UUID:        {t.id}")
            print(f"Subject:     {t.subject}")
            print(f"Department:  {dept}")
            print(f"Category:    {t.category}")
            print(f"Priority:    {t.priority}")
            print(f"Calculated:  {calculated_id}")
            print("-" * 40)
            
    finally:
        db.close()

def get_asset_letter(category, subject):
    """Maps ticket category/subject to the Asset Letter Matrix."""
    cat = (category or '').upper()
    sub = (subject or '').upper()
    
    if 'SERVER' in cat or 'SERVER' in sub: return 'S'
    if 'LAPTOP' in cat or 'LAPTOP' in sub: return 'L'
    if 'DESKTOP' in cat or 'DESKTOP' in sub: return 'D'
    if any(x in cat for x in ['NETWORK', 'WIFI', 'VPN']) or any(x in sub for x in ['NETWORK', 'WIFI']): return 'N'
    if any(x in cat for x in ['MOBILE', 'PHONE']) or any(x in sub for x in ['PHONE', 'MOBILE']): return 'M'
    if any(x in cat for x in ['SOFTWARE', 'APP', 'LICENSE']) or any(x in sub for x in ['SOFTWARE', 'APP']): return 'A'
    if any(x in cat for x in ['STORAGE', 'DRIVE', 'NAS']) or 'DISK' in sub: return 'T'
    if any(x in cat for x in ['PERIPHERAL', 'PRINTER', 'MOUSE', 'KEYBOARD']) or any(x in sub for x in ['PRINTER', 'JAM']): return 'P'
    if 'VIRTUAL' in cat or 'VM' in cat or 'VIRTUAL' in sub: return 'V'
    if 'HARDWARE' in cat or 'HARDWARE' in sub: return 'H'
    return 'O' # Fallback to OTHER

if __name__ == "__main__":
    search_id = "a88f"
    if len(sys.argv) > 1:
        search_id = sys.argv[1]
    
    verify_ticket_id(search_id)
