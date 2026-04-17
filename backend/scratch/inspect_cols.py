import pandas as pd
file_path = r"d:\ASSET-MANAGER\01-ALL DEPT EMP MASTER - COMPILE12.xlsx"
try:
    xl = pd.ExcelFile(file_path)
    sheet = xl.sheet_names[0]
    df = pd.read_excel(file_path, sheet_name=sheet, nrows=2)
    print(f"SHEET: {sheet}")
    print(f"COLUMNS: {df.columns.tolist()}")
    print(f"SAMPLE ROW: {df.iloc[0].to_dict()}")
except Exception as e:
    print(f"ERROR: {e}")
