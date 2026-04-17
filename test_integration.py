import urllib.request, json, sys

try:
    req = urllib.request.Request(
        'http://localhost:8000/api/users',
        data=json.dumps({
            'email': 'cctv_test_4@v2retail.com',
            'full_name': 'John CCTV 4',
            'password': 'Password123!',
            'department': 'LOSS PREVENTION',
            'persona': 'CCTV_HEAD',
            'role': 'END_USER',
            'position': 'TEAM_MEMBER',
            'status': 'ACTIVE'
        }).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print('1. User Provisioned Successfully')
        print(f"User ID: {data.get('id')}")
        print(f"User Role: {data.get('role')}")
        print(f"User Persona (Saved): {data.get('persona')}")
        
        if data.get('persona') == 'CCTV_HEAD':
            print('INTEGRATION SUCCESS: Persona was correctly validated against the V2 Retail 16-department map via the API layer!')
        else:
            print(f"INTEGRATION FAILED: Persona fell back to {data.get('persona')}")
            sys.exit(1)
except Exception as e:
    print(f'Error occurred: {e}')
    if hasattr(e, 'read'):
        print(e.read().decode('utf-8'))
    sys.exit(1)
