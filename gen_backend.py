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
        if ds == 'CCTV': ds = 'LOSS PREVENTION'
        if ds == 'LOSS_PREVENTION': ds = 'LOSS PREVENTION'
        if ds == 'RETAIL_OPERATION': ds = 'RETAIL OPERATION'
        
        dept_desgs[ds].add(str(desg).strip())

out = 'PERSONA_MAP = {\n'
for dept in sorted(dept_desgs.keys()):
    out += f'    "{dept}": ['
    desgs = sorted(dept_desgs[dept])
    
    seen_vals = set()
    dedup_desgs = []
    for d in desgs:
        val = d.replace(' ','_').replace('-','_').replace('/', '_').upper()
        if val not in seen_vals:
            seen_vals.add(val)
            dedup_desgs.append(val)
    
    parts = []
    for val in dedup_desgs:
        parts.append(f'"{val}"')
    
    out += ', '.join(parts)
    out += '],\n'

out += '}\n'

with open(r'd:\ASSET-MANAGER\backend_persona_map_repl.py', 'w', encoding='utf-8') as f:
    f.write(out)

print(out)
