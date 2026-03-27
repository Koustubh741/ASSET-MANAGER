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
        user_raw,
        f"{user_raw}@{base_dn}",
        f"{domain}\\{user_raw}"
    ]
    
    for fmt in formats:
        print(f"--- Testing user format: '{fmt}' on Port 389 with STARTTLS ---")
        try:
            # Create TLS configuration with NO VALIDATION
            tls = Tls(validate=ssl.CERT_NONE, version=ssl.PROTOCOL_TLSv1_2)
            # Pass tls to Server
            server = Server(server_addr, port=389, use_ssl=False, tls=tls, get_info=ALL)
            conn = Connection(server, user=fmt, password=password)
            conn.open()
            print("Connection opened, starting TLS...")
            conn.start_tls() # This will use server.tls_configuration
            print("TLS started, binding...")
            conn.bind()
            print(f"SUCCESS with user: {fmt}")
            print(f"Server info: {server.info}")
            conn.unbind()
            return # Exit on first success
        except Exception as e:
            print(f"Failed on Port 389 STARTTLS: {e}")

if __name__ == "__main__":
    test_ldap()
