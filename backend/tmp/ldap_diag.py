import os
import sys
from ldap3 import Server, Connection, ALL, Tls
import ssl
from dotenv import load_dotenv

load_dotenv()

def test_ldap():
    server_addr = os.getenv("LDAP_SERVER")
    user = os.getenv("LDAP_USER")
    password = os.getenv("LDAP_PASSWORD")
    
    # Try port 389 (plain)
    print(f"--- Attempting Port 389 (Plain) to {server_addr} ---")
    try:
        server = Server(server_addr, port=389, get_info=ALL)
        conn = Connection(server, user=user, password=password, auto_bind=True)
        print("✓ Success on Port 389 (Plain)")
        conn.unbind()
    except Exception as e:
        print(f"✗ Failed on Port 389: {e}")

    # Try port 636 (SSL)
    print(f"\n--- Attempting Port 636 (SSL) to {server_addr} ---")
    try:
        tls = Tls(validate=ssl.CERT_NONE) # Disable cert validation for test
        server = Server(server_addr, port=636, use_ssl=True, tls=tls, get_info=ALL)
        conn = Connection(server, user=user, password=password, auto_bind=True)
        print("✓ Success on Port 636 (SSL)")
        conn.unbind()
    except Exception as e:
        print(f"✗ Failed on Port 636: {e}")

if __name__ == "__main__":
    test_ldap()
