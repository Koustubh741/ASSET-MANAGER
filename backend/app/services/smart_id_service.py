from datetime import datetime
from uuid import UUID
from typing import Optional

class SmartIDService:
    ASSET_LETTER_MATRIX = {
        "Server": "S",
        "Laptop": "L",
        "Desktop": "D",
        "Network": "N",
        "Mobile": "M",
        "Software": "A", # A for Applications/Software
        "Storage": "T",
        "Peripheral": "P",
        "Virtual": "V",
        "Virtual Machine": "V",
        "VM": "V",
        "Hardware": "H",
        "Other": "O"
    }

    PRIORITY_MAP = {
        "Critical": "1",
        "High": "1",
        "Medium": "2",
        "Low": "3"
    }

    @classmethod
    def generate(cls, 
                 dept: Optional[str], 
                 priority: str, 
                 category: Optional[str], 
                 asset_type: Optional[str], 
                 created_at: datetime, 
                 ticket_uuid: UUID) -> str:
        """
        Generates a Smart ID based on the Legend: [DEPT]-[TARGET]-[DATE]-[UUID]
        Format: AAA-A#-YYMMDD-XXXX
        """
        
        # 1. Dept (First 3 letters, uppercase)
        dept_code = "GEN"
        if dept:
            # Handle short depts like "HR" or "IT"
            clean_dept = dept.strip().upper()
            if len(clean_dept) >= 3:
                dept_code = clean_dept[:3]
            else:
                dept_code = clean_dept.ljust(3, "X") # HR -> HRX, IT -> ITX
        
        # 2. Target (Asset Letter + Priority Num)
        asset_letter = "O" # Default Other
        
        # Priority mapping
        pri_code = cls.PRIORITY_MAP.get(priority, "2") # Default Medium

        # Asset mapping - check asset_type first, then fallback to category
        search_key = asset_type or category or "Other"
        for key, code in cls.ASSET_LETTER_MATRIX.items():
            if key.lower() in search_key.lower():
                asset_letter = code
                break
        
        target_code = f"{asset_letter}{pri_code}"

        # 3. Date (YYMMDD)
        date_code = created_at.strftime("%y%m%d")

        # 4. UUID (First 4 chars)
        uuid_code = str(ticket_uuid).replace("-", "")[:4].upper()

        return f"{dept_code}-{target_code}-{date_code}-{uuid_code}"
