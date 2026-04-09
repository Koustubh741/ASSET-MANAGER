import os

log_path = r'd:\ASSET-MANAGER\debug_errors.log'

try:
    with open(log_path, 'r', encoding='utf-8') as f:
        content = f.read()
except UnicodeDecodeError:
    with open(log_path, 'r', encoding='latin-1') as f:
        content = f.read()

# Filter for the most recent tracebacks (Stage 7/8)
sections = content.split("---")
recent = sections[-5:]

for s in recent:
    print("--- SECTION ---")
    print(s)
