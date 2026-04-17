import pandas as pd
import json

file_path = r'd:\ASSET-MANAGER\01-ALL DEPT EMP MASTER - COMPILE12.xlsx'

try:
    df = pd.read_excel(file_path, sheet_name='DESG')
    
    # Identify designation columns (they end with _desg)
    desg_cols = [c for c in df.columns if c.endswith('_desg')]
    
    mapping = {}
    
    for col in desg_cols:
        # Extract department name from column name (e.g., 'IT_desg' -> 'IT')
        dept_key = col.replace('_desg', '').upper()
        
        # Handle special case: 'BUYING_AND_MERCHANDISING' -> 'B&M'
        if dept_key == 'BUYING_AND_MERCHANDISING':
            dept_key = 'B&M'
        if dept_key == 'FINANCE':
            dept_key = 'F&A'
        if dept_key == 'RETAIL OPERATION':
            dept_key = 'RETAIL' # Check v2 list: RETAIL and RETAIL OPERATION are separate
            
        # Get unique non-null values
        values = [str(v).strip() for v in df[col].unique() if pd.notna(v) and str(v).strip() != 'nan']
        
        # Format as { value, label }
        persona_list = [{ "value": v.upper().replace(' ', '_'), "label": v } for v in values]
        
        mapping[dept_key] = persona_list

    # Save to json
    with open('d:/ASSET-MANAGER/backend/scratch/persona_mapping_v2.json', 'w') as f:
        json.dump(mapping, f, indent=4)
        
    print("Mapping extracted to persona_mapping_v2.json")
    print("Departments mapped:", list(mapping.keys()))

except Exception as e:
    print(f"Error: {e}")
