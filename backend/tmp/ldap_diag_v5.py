import os
import sys
from ldap3 import Server, Connection, ALL, Tls
import ssl
from dotenv import load_dotenv

load_dotenv()

def test_ldap():
    server_addr = os.getenv("LDAP_SERVER")
    base_dn = os.getenv("LDAP_BASE_DN")
    user_raw = os.getenv("LDAP_USER")
    password = os.getenv("LDAP_PASSWORD")
    domain = os.getenv("LDAP_DOMAIN", "cachedigitech").split('.')[0]
    
    formats = [
        f"{user_raw}@{base_dn}",
        f"{domain}\\{user_raw}"
    ]
    
    ports = [3268, 3269]
    
    for port in ports:
        for fmt in formats:
            use_ssl = (port == 3269)
            print(f"--- Testing user format: '{fmt}' on Port {port} (SSL={use_ssl}) ---")
            try:
                tls = Tls(validate=ssl.CERT_NONE) if use_ssl else None
                server = Server(server_addr, port=port, use_ssl=use_ssl, tls=tls, get_info=ALL)
                conn = Connection(server, user=fmt, password=password, auto_bind=True)
                print(f"SUCCESS with user: {fmt} on Port {port}")
                conn.unbind()
                return 
            except Exception as e:
                print(f"Failed on Port {port}: {e}")

if __name__ == "__main__":
    test_ldap()
