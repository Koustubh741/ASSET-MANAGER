import json
import re

with open('d:/ASSET-MANAGER/frontend/curl_output.txt', encoding='utf-8', errors='ignore') as f:
    text = f.read()

# Find the "err":{...} object
m = re.search(r'"err":(\{.*?\})', text)
if m:
    try:
        err_obj = json.loads(m.group(1))
        print("ERROR MESSAGE:")
        print(err_obj.get('message', 'No message found'))
    except Exception as e:
        print("Failed to parse JSON:", e)
else:
    print("No err object found in the curl output")
