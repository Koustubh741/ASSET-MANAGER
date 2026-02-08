import sys
import shutil
import os

print(f"Active Python: {sys.executable}")
print("-" * 50)

# Check PATH
print("Python Executables in PATH:")
found = set()
for path in os.environ["PATH"].split(os.pathsep):
    try:
        if os.path.exists(path):
            exe = shutil.which("python", path=path)
            if exe and exe.lower() not in found:
                print(f"  - {exe}")
                found.add(exe.lower())
    except:
        pass

# Check common Windows locations
print("\nChecking Common Locations:")
common_paths = [
    r"C:\Python311\python.exe",
    r"C:\Python312\python.exe",
    r"C:\Users\Admin\AppData\Local\Programs\Python\Python311\python.exe",
    r"C:\Users\Admin\AppData\Local\Programs\Python\Python312\python.exe",
]

for p in common_paths:
    if os.path.exists(p) and p.lower() not in found:
        print(f"  - {p}")
        found.add(p.lower())
