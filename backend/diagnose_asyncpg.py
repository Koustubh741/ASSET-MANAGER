import sys
import subprocess

print("=" * 60)
print("DIAGNOSTIC REPORT")
print("=" * 60)

# 1. Check Python executable
print(f"\n1. Active Python: {sys.executable}")

# 2. Try importing asyncpg
print("\n2. Testing asyncpg import...")
try:
    import asyncpg
    print(f"   ✅ SUCCESS: asyncpg {asyncpg.__version__} is installed")
    print(f"   Location: {asyncpg.__file__}")
except ImportError as e:
    print(f"   ❌ FAILED: {e}")

# 3. Check pip list
print("\n3. Checking pip packages...")
result = subprocess.run(
    [sys.executable, "-m", "pip", "list"],
    capture_output=True,
    text=True
)
if "asyncpg" in result.stdout:
    for line in result.stdout.split("\n"):
        if "asyncpg" in line.lower():
            print(f"   {line}")
else:
    print("   ❌ asyncpg NOT found in pip list")

# 4. Check sys.path
print("\n4. Python sys.path:")
for p in sys.path[:5]:  # Show first 5 paths
    print(f"   - {p}")

print("\n" + "=" * 60)
print("END OF REPORT")
print("=" * 60)
