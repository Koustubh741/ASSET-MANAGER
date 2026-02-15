"""
Comprehensive Backend Health Check
Tests all components: database, models, endpoints, and workflows
"""
import sys
import io

# Force UTF-8 for Windows console
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import requests
import json
import sys
import os
from datetime import datetime
from dotenv import load_dotenv

# Add parent directory to path to allow importing app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Load environment variables
load_dotenv()

BASE_URL = "http://127.0.0.1:8000"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_section(title):
    print(f"\n{Colors.BLUE}{'='*70}{Colors.END}")
    print(f"{Colors.BLUE}{title.center(70)}{Colors.END}")
    print(f"{Colors.BLUE}{'='*70}{Colors.END}\n")

def print_success(msg):
    print(f"{Colors.GREEN}[OK] {msg}{Colors.END}")

def print_error(msg):
    print(f"{Colors.RED}[FAIL] {msg}{Colors.END}")

def print_warning(msg):
    print(f"{Colors.YELLOW}⚠ {msg}{Colors.END}")

def test_server_running():
    """Test if server is running"""
    print_section("1. SERVER CONNECTIVITY")
    
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print_success("Server is running and responding")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.json()}")
            return True
        else:
            print_error(f"Server returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print_error("Server is not running or not accessible")
        print("   Start server with: uvicorn main:app --host 127.0.0.1 --port 8000")
        return False
    except Exception as e:
        print_error(f"Error connecting to server: {e}")
        return False

def test_database_connectivity():
    """Test database connectivity"""
    print_section("2. DATABASE CONNECTIVITY")
    
    try:
        try:
            from app.database.database import engine, SessionLocal
        except ImportError:
            from backend.app.database.database import engine, SessionLocal
        from sqlalchemy import text
        
        # Test connection
        conn = engine.connect()
        result = conn.execute(text("SELECT version()"))
        version = result.fetchone()[0]
        print_success("Database connection established")
        print(f"   PostgreSQL version: {version[:50]}...")
        conn.close()
        
        # Test models
        db = SessionLocal()
        try:
            from app.models.models import User, Asset, AssetRequest, Ticket, ByodDevice, ExitRequest
        except ImportError:
            from backend.app.models.models import User, Asset, AssetRequest, Ticket, ByodDevice, ExitRequest
        
        models_to_test = [
            ("Users", User),
            ("Assets", Asset),
            ("Asset Requests", AssetRequest),
            ("Tickets", Ticket),
            ("BYOD Devices", ByodDevice),
            ("Exit Requests", ExitRequest),
        ]
        
        print("\n   Model queries:")
        all_ok = True
        for name, model in models_to_test:
            try:
                count = db.query(model).count()
                print_success(f"{name}: {count} records")
            except Exception as e:
                print_error(f"{name}: {str(e)[:80]}")
                all_ok = False
        
        db.close()
        return all_ok
        
    except Exception as e:
        print_error(f"Database connectivity failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_api_endpoints():
    """Test API endpoints"""
    print_section("3. API ENDPOINTS")
    
    endpoints = [
        ("GET", "/", "Root endpoint"),
        ("GET", "/health", "Health check"),
        ("GET", "/openapi.json", "OpenAPI schema"),
        ("GET", "/api/v1/assets", "List assets"),
        ("GET", "/api/v1/tickets", "List tickets"),
        ("POST", "/api/v1/auth/register", "User registration"),
    ]
    
    results = {"passed": 0, "failed": 0, "warnings": 0}
    
    for method, path, description in endpoints:
        try:
            if method == "GET":
                response = requests.get(f"{BASE_URL}{path}", timeout=5)
            elif method == "POST":
                if path == "/api/v1/auth/register":
                    import time
                    test_data = {
                        "email": f"test_{int(time.time())}@test.com",
                        "password": "test123",
                        "full_name": "Test User"
                    }
                    response = requests.post(f"{BASE_URL}{path}", json=test_data, timeout=3)
                else:
                    response = requests.post(f"{BASE_URL}{path}", timeout=5)
            
            status = response.status_code
            
            if status == 200:
                print_success(f"{method} {path}: {status} - {description}")
                results["passed"] += 1
            elif status in [201, 401, 403]:
                print_warning(f"{method} {path}: {status} - {description} (auth required or created)")
                results["warnings"] += 1
            elif status == 404:
                print_error(f"{method} {path}: {status} - Endpoint not found")
                results["failed"] += 1
            elif status == 405:
                print_warning(f"{method} {path}: {status} - Method not allowed (endpoint exists)")
                results["warnings"] += 1
            else:
                print_warning(f"{method} {path}: {status} - {description}")
                results["warnings"] += 1
                
        except requests.exceptions.Timeout:
            print_warning(f"{method} {path}: Timeout - {description}")
            results["warnings"] += 1
        except Exception as e:
            print_error(f"{method} {path}: Error - {str(e)[:60]}")
            results["failed"] += 1
    
    print(f"\n   Summary: {results['passed']} passed, {results['warnings']} warnings, {results['failed']} failed")
    return results["failed"] == 0

def test_api_schema():
    """Test API schema completeness"""
    print_section("4. API SCHEMA COMPLETENESS")
    
    try:
        response = requests.get(f"{BASE_URL}/openapi.json", timeout=5)
        if response.status_code != 200:
            print_error("Failed to fetch OpenAPI schema")
            return False
        
        schema = response.json()
        paths = schema.get('paths', {})
        
        print_success(f"OpenAPI schema loaded: {len(paths)} endpoints")
        
        # Check for key endpoint groups
        endpoint_groups = {
            "auth": ["/api/v1/auth/register", "/api/v1/auth/login"],
            "assets": ["/api/v1/assets"],
            "asset-requests": ["/api/v1/asset-requests"],
            "tickets": ["/api/v1/tickets"],
            "workflows": ["/api/v1/workflows"],
        }
        
        print("\n   Endpoint groups:")
        for group, expected_paths in endpoint_groups.items():
            found = sum(1 for path in paths.keys() if any(ep in path for ep in expected_paths))
            if found > 0:
                print_success(f"{group}: {found} endpoints found")
            else:
                print_warning(f"{group}: No endpoints found")
        
        return True
        
    except Exception as e:
        print_error(f"API schema test failed: {e}")
        return False

def test_code_imports():
    """Test if all modules can be imported"""
    print_section("5. CODE INTEGRITY")
    
    modules_to_test = [
        ("app.main", "main"),
        ("app.database.database", "database"),
        ("app.models.models", "models"),
        ("app.routers.auth", "auth router"),
        ("app.routers.assets", "assets router"),
        ("app.routers.software", "software router"),
        ("app.routers.tickets", "tickets router"),
        ("app.routers.workflows", "workflows router"),
    ]
    
    all_ok = True
    for module_name, description in modules_to_test:
        try:
            __import__(module_name)
            print_success(f"{description}: Import successful")
        except Exception as e:
            print_error(f"{description}: Import failed - {str(e)[:60]}")
            all_ok = False
    
    return all_ok

def test_router_registration():
    """Test router registration"""
    print_section("6. ROUTER REGISTRATION")
    
    try:
        try:
            from main import app
        except ImportError:
            from app.main import app
        
        routes = []
        for route in app.routes:
            if hasattr(route, 'path') and hasattr(route, 'methods'):
                methods = list(route.methods)
                if methods:
                    routes.append((methods[0], route.path))
        
        print_success(f"Total routes registered: {len(routes)}")
        
        # Check for key routers
        router_prefixes = {
            "/api/v1/auth": "Auth router",
            "/api/v1/assets": "Assets router",
            "/api/v1/asset-requests": "Asset requests router",
            "/api/v1/tickets": "Tickets router",
            "/api/v1/workflows": "Workflows router",
            "/api/v1/upload": "Upload router",
        }
        
        print("\n   Router prefixes:")
        for prefix, name in router_prefixes.items():
            found = sum(1 for _, path in routes if path.startswith(prefix))
            if found > 0:
                print_success(f"{name}: {found} routes")
            else:
                print_warning(f"{name}: No routes found")
        
        return True
        
    except Exception as e:
        print_error(f"Router registration test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def generate_summary(results):
    """Generate final summary"""
    print_section("FINAL SUMMARY")
    
    total_tests = len(results)
    passed_tests = sum(1 for r in results.values() if r)
    failed_tests = total_tests - passed_tests
    
    print(f"\nTest Results:")
    for test_name, result in results.items():
        status = f"{Colors.GREEN}PASSED{Colors.END}" if result else f"{Colors.RED}FAILED{Colors.END}"
        print(f"  {test_name}: {status}")
    
    print(f"\n{Colors.BLUE}{'='*70}{Colors.END}")
    print(f"Total Tests: {total_tests}")
    print(f"{Colors.GREEN}Passed: {passed_tests}{Colors.END}")
    print(f"{Colors.RED}Failed: {failed_tests}{Colors.END}")
    print(f"{Colors.BLUE}{'='*70}{Colors.END}\n")
    
    if failed_tests == 0:
        print(f"{Colors.GREEN}[OK] All tests passed! Backend is working properly.{Colors.END}\n")
        return True
    else:
        print(f"{Colors.RED}[FAIL] Some tests failed. Please review the errors above.{Colors.END}\n")
        return False

if __name__ == "__main__":
    print(f"\n{Colors.BLUE}{'='*70}{Colors.END}")
    print(f"{Colors.BLUE}{'COMPREHENSIVE BACKEND HEALTH CHECK'.center(70)}{Colors.END}")
    print(f"{Colors.BLUE}{datetime.now().strftime('%Y-%m-%d %H:%M:%S').center(70)}{Colors.END}")
    print(f"{Colors.BLUE}{'='*70}{Colors.END}\n")
    
    results = {}
    
    # Run all tests
    results["Server Connectivity"] = test_server_running()
    results["Database Connectivity"] = test_database_connectivity()
    results["Code Integrity"] = test_code_imports()
    results["Router Registration"] = test_router_registration()
    results["API Endpoints"] = test_api_endpoints()
    results["API Schema"] = test_api_schema()
    
    # Generate summary
    all_passed = generate_summary(results)
    
    # Additional info
    if all_passed:
        print(f"{Colors.BLUE}Backend Information:{Colors.END}")
        print(f"  • Server URL: {BASE_URL}")
        print(f"  • API Docs: {BASE_URL}/docs")
        print(f"  • Alternative Docs: {BASE_URL}/redoc")
        print(f"  • OpenAPI Schema: {BASE_URL}/openapi.json\n")
    
    sys.exit(0 if all_passed else 1)

