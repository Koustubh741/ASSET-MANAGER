import pandas as pd
import json
import os

file_path = r'd:\ASSET-MANAGER\01-ALL DEPT EMP MASTER - COMPILE12.xlsx'

if not os.path.exists(file_path):
    print(f"File not found: {file_path}")
    exit(1)

try:
    # Read first 10 rows to see columns
    df = pd.read_excel(file_path, nrows=10)
    print("Columns found:")
    print(df.columns.tolist())
    
    # Read the whole sheet (assuming it's reasonable size)
    df_full = pd.read_excel(file_path)
    
    # Detect relevant columns (case-insensitive)
    dept_col = next((c for c in df_full.columns if 'department' in c.lower()), None)
    desig_col = next((c for c in df_full.columns if 'designation' in c.lower()), None)
    
    if dept_col and desig_col:
        print(f"Using columns: {dept_col} and {desig_col}")
        
        # Group designations by department
        mapping = {}
        for dept, group in df_full.groupby(dept_col):
            # Clean department name
            dept_name = str(dept).strip().upper()
            
            # Get unique designations, filter out nans
            designations = [str(d).strip().upper() for d in group[desig_col].unique() if pd.notna(d)]
            
            mapping[dept_name] = designations
            
        # Write mapping to a json for reference
        with open('persona_mapping.json', 'w') as f:
            json.dump(mapping, f, indent=4)
        print("Mapping saved to persona_mapping.json")
    else:
        print("Required columns (Department/Designation) not found.")
        print("Available columns:", df_full.columns.tolist())

except Exception as e:
    print(f"Error reading excel: {e}")
