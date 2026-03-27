import os
import sys
from ldap3 import Server, Connection, ALL, NTLM
import ssl
from dotenv import load_dotenv

load_dotenv()

def test_ldap():
    server_addr = os.getenv("LDAP_SERVER")
    base_dn = os.getenv("LDAP_BASE_DN")
    user_raw = os.getenv("LDAP_USER")
    password = os.getenv("LDAP_PASSWORD")
    domain = os.getenv("LDAP_DOMAIN", "cachedigitech.local").split('.')[0]
    
    # For NTLM, user is usually domain\username
    formats = [
        f"{domain}\\{user_raw}",
        f"{user_raw}"
    ]
    
    for fmt in formats:
        print(f"--- Testing user format: '{fmt}' on Port 389 (NTLM) ---")
        try:
            server = Server(server_addr, port=389, get_info=ALL)
            conn = Connection(server, user=fmt, password=password, authentication=NTLM, auto_bind=True)
            print(f"SUCCESS with user: {fmt} on Port 389 (NTLM)")
            print(f"Server info: {server.info}")
            conn.unbind()
            return 
        except Exception as e:
            print(f"Failed on Port 389 (NTLM): {e}")

if __name__ == "__main__":
    test_ldap()
