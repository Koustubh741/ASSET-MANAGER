import pandas as pd
import sys

file_path = r"d:\ASSET-MANAGER\01-ALL DEPT EMP MASTER - COMPILE12.xlsx"

try:
    # Try reading with openpyxl (standard for .xlsx)
    df = pd.read_excel(file_path, nrows=20)
    print("--- FIRST 20 ROWS ---")
    print(df.to_string())
    print("\n--- COLUMNS ---")
    print(df.columns.tolist())
    
    # Also get all sheet names
    xl = pd.ExcelFile(file_path)
    print("\n--- SHEETS ---")
    print(xl.sheet_names)
    
except Exception as e:
    print(f"Error reading Excel file: {e}")
    # Try to see if it's just a file existence issue
    import os
    if not os.path.exists(file_path):
        print(f"File does not exist at {file_path}")
    else:
        print(f"File exists but could not be read. Size: {os.path.getsize(file_path)} bytes")
