import pandas as pd
import os

file_path = r"d:\ASSET-MANAGER\01-ALL DEPT EMP MASTER - COMPILE12.xlsx"
output_path = r"d:\ASSET-MANAGER\backend\scratch\excel_dump.txt"

try:
    xl = pd.ExcelFile(file_path)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(f"SHEETS: {xl.sheet_names}\n\n")
        for sheet in xl.sheet_names:
            f.write(f"--- SHEET: {sheet} ---\n")
            # Read first 50 rows to avoid memory/time issues
            df = pd.read_excel(xl, sheet_name=sheet, nrows=50)
            f.write(df.to_string())
            f.write("\n\n")
            f.write(f"COLUMNS: {df.columns.tolist()}\n\n")
            
    print("SUCCESS")
except Exception as e:
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(f"ERROR: {str(e)}")
    print(f"FAILURE: {e}")
