import urllib.request
import json
import sys

with open("api_result.txt", "w") as f:
    f.write("Testing API endpoint http://localhost:8000/api/v1/software/discovered...\n")
    try:
        with urllib.request.urlopen("http://localhost:8000/api/v1/software/discovered", timeout=5) as response:
            if response.status == 200:
                data = json.load(response)
                f.write(f"✅ Success! API returned {len(data)} software items.\n")
                if len(data) > 0:
                    f.write("First 3 items:\n")
                    f.write(json.dumps(data[:3], indent=2))
                else:
                    f.write("⚠️  Warning: API returned empty list.\n")
            else:
                f.write(f"❌ Error: API returned status {response.status}\n")
    except Exception as e:
        f.write(f"❌ Connection Error: {e}\n")
