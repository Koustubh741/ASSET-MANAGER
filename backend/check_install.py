import importlib.util
try:
    spec = importlib.util.find_spec("asyncpg")
    with open("install_check.txt", "w") as f:
        if spec:
            f.write("asyncpg is installed.\n")
        else:
            f.write("asyncpg is NOT installed.\n")
except Exception as e:
    with open("install_check.txt", "w") as f:
        f.write(f"Error: {e}\n")
