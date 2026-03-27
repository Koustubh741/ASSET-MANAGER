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
    
    fmt = f"{user_raw}@{base_dn}"
    
    print(f"--- Testing user format: '{fmt}' on Port 389 with STARTTLS (Relaxed) ---")
    try:
        # Relaxed security level for ciphers
        tls = Tls(validate=ssl.CERT_NONE, version=ssl.PROTOCOL_TLSv1_2, ciphers='DEFAULT@SECLEVEL=1')
        server = Server(server_addr, port=389, use_ssl=False, tls=tls, get_info=ALL)
        conn = Connection(server, user=fmt, password=password)
        conn.open()
        print("Connection opened, starting TLS...")
        if not conn.start_tls():
            print("StartTLS failed (returned False)")
            # Try to bind anyway to see what happens
            print("Attempting bind without TLS...")
            conn.bind()
            print("Bind SUCCESS without TLS (wait, what?)")
        else:
            print("TLS started, binding...")
            conn.bind()
            print(f"SUCCESS with user: {fmt}")
        conn.unbind()
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    test_ldap()
