import sys

def find_non_ascii(file_path):
    try:
        with open(file_path, 'rb') as f:
            content = f.read()
            for i, byte in enumerate(content):
                if byte > 127:
                    # Find line number
                    line_num = content[:i].count(b'\n') + 1
                    char = content[i:i+1]
                    print(f"Non-ASCII byte: {hex(byte)} at line {line_num}, offset {i}. Context: {content[max(0, i-10):i+10]}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    find_non_ascii(r"d:\ASSET-MANAGER\backend\scripts\cloud_discovery_agent.py")
