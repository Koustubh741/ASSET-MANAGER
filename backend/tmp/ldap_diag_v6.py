import os
import sys
from ldap3 import Server, Connection, ALL, DIGEST_MD5
from dotenv import load_dotenv

load_dotenv()

def test_ldap():
    server_addr = os.getenv("LDAP_SERVER")
    base_dn = os.getenv("LDAP_BASE_DN")
    user_raw = os.getenv("LDAP_USER")
    password = os.getenv("LDAP_PASSWORD")
    domain = os.getenv("LDAP_DOMAIN", "cachedigitech").split('.')[0]
    
    # For DIGEST-MD5, user is usually just the username or domain\username
    formats = [
        user_raw,
        f"{domain}\\{user_raw}"
    ]
    
    for fmt in formats:
        print(f"--- Testing user format: '{fmt}' on Port 389 (DIGEST-MD5) ---")
        try:
            server = Server(server_addr, port=389, get_info=ALL)
            conn = Connection(server, user=fmt, password=password, authentication=DIGEST_MD5, auto_bind=True)
            print(f"SUCCESS with user: {fmt} on Port 389 (DIGEST-MD5)")
            conn.unbind()
            return 
        except Exception as e:
            print(f"Failed on Port 389 (DIGEST-MD5): {e}")

if __name__ == "__main__":
    test_ldap()
