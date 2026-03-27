import os
from ldap3 import Server, Connection, ALL
from dotenv import load_dotenv

load_dotenv()

def test_ldap_dn():
    server_addr = os.getenv("LDAP_SERVER")
    base_dn = os.getenv("LDAP_BASE_DN")
    user_dn = f"CN=Administrator,CN=Users,{','.join(['DC=' + d for d in base_dn.split('.')])}"
    password = os.getenv("LDAP_PASSWORD")
    
    print(f"--- Testing user DN: '{user_dn}' on Port 389 ---")
    try:
        server = Server(server_addr, port=389, get_info=ALL)
        conn = Connection(server, user=user_dn, password=password, auto_bind=True)
        print("SUCCESS with DN bind")
        conn.unbind()
    except Exception as e:
        print(f"Failed with DN bind: {e}")

if __name__ == "__main__":
    test_ldap_dn()
