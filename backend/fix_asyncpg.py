import sys
import subprocess
import importlib.util

print(f"Current Python Executable: {sys.executable}")

def install(package):
    print(f"Installing {package}...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", package])

try:
    if importlib.util.find_spec("asyncpg") is None:
        print("asyncpg not found. Installing...")
        install("asyncpg")
    else:
        print("asyncpg is already installed.")
        # Force reinstall to be safe if it's broken
        install("asyncpg --force-reinstall")
        
    import asyncpg
    print(f"SUCCESS: asyncpg imported successfully from {asyncpg.__file__}")

except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
