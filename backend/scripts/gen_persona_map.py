import openpyxl, sys, io, collections, json

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
wb = openpyxl.load_workbook(r'd:\ASSET-MANAGER\01-ALL DEPT EMP MASTER - COMPILE12.xlsx', read_only=True, data_only=True)

dept_desgs = collections.defaultdict(set)
for i, row in enumerate(wb['DESG'].iter_rows(values_only=True)):
    if i == 0: continue
    dept = row[0]
    desg = row[1]
    if dept and desg:
        ds = str(dept).strip()
        # Map CCTV to LOSS PREVENTION
        if ds == 'CCTV': ds = 'LOSS PREVENTION'
        # Normalize LOSS_PREVENTION to LOSS PREVENTION
        if ds == 'LOSS_PREVENTION': ds = 'LOSS PREVENTION'
        # Normalize RETAIL_OPERATION to RETAIL OPERATION
        if ds == 'RETAIL_OPERATION': ds = 'RETAIL OPERATION'
        
        dept_desgs[ds].add(str(desg).strip())

out = 'export const PERSONA_MAP = {\n'
for dept in sorted(dept_desgs.keys()):
    out += f'    "{dept}": [\n'
    desgs = sorted(dept_desgs[dept])
    for i, d in enumerate(desgs):
        val = d.replace(' ','_').replace('-','_').replace('/', '_').upper()
        comma = ',' if i < len(desgs)-1 else ''
        out += f'        {{ "value": "{val}", "label": "{d}" }}{comma}\n'
    out += '    ],\n'
out += '};\n'

with open(r'd:\ASSET-MANAGER\scratch_persona_map.js', 'w', encoding='utf-8') as f:
    f.write(out)
print('Wrote scratch_persona_map.js successfully')
