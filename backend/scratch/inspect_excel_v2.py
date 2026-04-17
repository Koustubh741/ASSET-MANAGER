import pandas as pd
import json
import os

file_path = r'd:\ASSET-MANAGER\01-ALL DEPT EMP MASTER - COMPILE12.xlsx'

try:
    xl = pd.ExcelFile(file_path)
    print("Sheets found:", xl.sheet_names)
    
    for sheet_name in xl.sheet_names:
        print(f"\n--- Checking sheet: {sheet_name} ---")
        df = xl.parse(sheet_name, nrows=5)
        print("Columns:", df.columns.tolist())
        print("First row values:", df.iloc[0].values if len(df) > 0 else "Empty")

except Exception as e:
    print(f"Error inspecting excel: {e}")
