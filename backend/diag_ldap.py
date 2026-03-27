import os
from ldap3 import Server, Connection, ALL, NTLM, Tls
import ssl
from dotenv import load_dotenv

load_dotenv()

server_name = os.getenv("LDAP_SERVER")
user_name = os.getenv("LDAP_USER")
password = os.getenv("LDAP_PASSWORD")
base_dn = os.getenv("LDAP_BASE_DN")

def test_connection(port, use_ssl=False, use_start_tls=False, authentication=None, custom_user=None):
    effective_user = custom_user or user_name
    print(f"\nTesting Port: {port}, SSL: {use_ssl}, StartTLS: {use_start_tls}, Auth: {authentication or 'SIMPLE'}, User: {effective_user}")
    try:
        tls_config = Tls(validate=ssl.CERT_NONE)
        server = Server(server_name, port=port, use_ssl=use_ssl, tls=tls_config, get_info=ALL)
        conn = Connection(server, user=effective_user, password=password, authentication=authentication)
        
        if use_start_tls:
            conn.open()
            conn.start_tls()
            
        if conn.bind():
            print(f"SUCCESS: Connected and bound!")
            # print(f"Server Info: {server.info}")
            conn.unbind()
            return True
        else:
            print(f"FAILURE: Bind failed. Result: {conn.result}")
            return False
    except Exception as e:
        print(f"ERROR: {e}")
        return False

if __name__ == "__main__":
    print(f"Server: {server_name}")
    print(f"User: {user_name}")
    
    # Test 1: Simple Bind on 389
    test_connection(389)
    
    # Test 2: Simple Bind on 636 (LDAPS)
    test_connection(636, use_ssl=True)
    
    # Test 3: NTLM Bind on 389 with DOMAIN\user
    domain = os.getenv("LDAP_DOMAIN", "CACHEDIGITECH").split('.')[0]
    user_simple = user_name.split('@')[0]
    ntlm_user = f"{domain}\\{user_simple}"
    test_connection(389, authentication=NTLM, custom_user=ntlm_user)
    
    # Test 4: NTLM Bind on 636 (LDAPS)
    test_connection(636, use_ssl=True, authentication=NTLM, custom_user=ntlm_user)
    
    # Test 5: StartTLS on 389 with Simple
    test_connection(389, use_start_tls=True)
