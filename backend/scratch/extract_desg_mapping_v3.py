import pandas as pd
import json

file_path = r'd:\ASSET-MANAGER\01-ALL DEPT EMP MASTER - COMPILE12.xlsx'

try:
    df = pd.read_excel(file_path, sheet_name='DESG')
    
    # Identify designation columns (they end with _desg)
    desg_cols = [c for c in df.columns if c.endswith('_desg')]
    
    mapping = {}
    
    for col in desg_cols:
        # Extract department name from column name
        dept_raw = col.replace('_desg', '').upper()
        
        # Canonical Mapping for Platform IDs
        dept_key = dept_raw
        if dept_raw == 'BUYING_AND_MERCHANDISING':
            dept_key = 'B&M'
        elif dept_raw == 'FINANCE':
            dept_key = 'F&A'
        # Keep RETAIL and RETAIL OPERATION distinct as per frontend config
            
        # Get unique non-null values
        values = [str(v).strip() for v in df[col].unique() if pd.notna(v) and str(v).strip() != 'nan']
        
        # Sort values
        values.sort()
        
        # Format as { value, label }
        persona_list = [{ "value": v.upper().replace(' ', '_').replace('-', '_').replace('/', '_'), "label": v } for v in values]
        
        mapping[dept_key] = persona_list

    # Save to json
    out_path = 'd:/ASSET-MANAGER/backend/scratch/persona_mapping_v3.json'
    with open(out_path, 'w') as f:
        json.dump(mapping, f, indent=4)
        
    print(f"Mapping extracted to {out_path}")
    print("Departments mapped:", sorted(list(mapping.keys())))

except Exception as e:
    print(f"Error: {e}")
