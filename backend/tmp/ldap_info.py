import os
from ldap3 import Server, Connection, ALL
from dotenv import load_dotenv

load_dotenv()

def get_server_info():
    server_addr = os.getenv("LDAP_SERVER")
    print(f"--- Getting Server Info to {server_addr}:389 ---")
    try:
        server = Server(server_addr, get_info=ALL)
        conn = Connection(server)
        conn.open()
        print("Connected SUCCESS")
        # Print info in a safe way
        with open("tmp/ldap_info_output.txt", "w") as f:
            f.write(str(server.info))
            f.write("\n\nSCHEMA\n\n")
            f.write(str(server.schema))
        print("Server info written to tmp/ldap_info_output.txt")
        conn.unbind()
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    get_server_info()
