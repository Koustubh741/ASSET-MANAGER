"""
Complete Backend Validation - Tests code, models, and workflow logic
"""
import sys
import os
from datetime import datetime

# Add the 'backend' directory to sys.path
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if base_dir not in sys.path:
    sys.path.append(base_dir)

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    END = '\033[0m'

def print_section(title):
    print(f"\n{Colors.BLUE}{'='*70}{Colors.END}")
    print(f"{Colors.BLUE}{title.center(70)}{Colors.END}")
    print(f"{Colors.BLUE}{'='*70}{Colors.END}\n")

def print_success(msg):
    print(f"{Colors.GREEN}[OK] {msg}{Colors.END}")

def print_error(msg):
    print(f"{Colors.RED}[FAIL] {msg}{Colors.END}")

def print_info(msg):
    print(f"{Colors.CYAN}ℹ {msg}{Colors.END}")

def test_imports():
    """Test all critical imports"""
    print_section("1. MODULE IMPORTS")
    
    modules = [
        ("app.main", "Main application"),
        ("app.models.models", "Database models"),
        ("app.utils.state_machine", "State machine"),
        ("app.services.asset_request_service", "Asset request service"),
        ("app.routers.asset_requests", "Asset requests router"),
        ("app.routers.auth", "Auth router"),
        ("app.routers.workflows", "Workflows router"),
        ("app.schemas.asset_request_schema", "Asset request schemas"),
    ]
    
    all_ok = True
    for module_name, desc in modules:
        try:
            __import__(module_name)
            print_success(f"{desc}: Import OK")
        except Exception as e:
            print_error(f"{desc}: {str(e)[:60]}")
            all_ok = False
    
    return all_ok

def test_state_machine():
    """Test state machine logic"""
    print_section("2. STATE MACHINE VALIDATION")
    
    try:
        from app.utils.state_machine import (
            is_valid_transition,
            get_valid_next_states,
            is_terminal_state,
            VALID_TRANSITIONS,
            TERMINAL_STATES
        )
        
        print_success(f"State machine loaded: {len(VALID_TRANSITIONS)} states defined")
        
        # Test valid transitions
        valid_tests = [
            ("SUBMITTED", "MANAGER_APPROVED"),
            ("MANAGER_APPROVED", "IT_APPROVED"),
            ("IT_APPROVED", "PROCUREMENT_REQUESTED"),
            ("PROCUREMENT_REQUESTED", "PROCUREMENT_APPROVED"),
            ("PROCUREMENT_APPROVED", "QC_PENDING"),
            ("QC_PENDING", "USER_ACCEPTANCE_PENDING"),
            ("USER_ACCEPTANCE_PENDING", "IN_USE"),
        ]
        
        print_info("Testing valid transitions:")
        for current, new in valid_tests:
            if is_valid_transition(current, new):
                print_success(f"{current} → {new}")
            else:
                print_error(f"{current} → {new} (should be valid)")
        
        # Test invalid transitions
        invalid_tests = [
            ("SUBMITTED", "IT_APPROVED"),  # Must go through manager first
            ("MANAGER_REJECTED", "IT_APPROVED"),  # Terminal state
            ("CLOSED", "IN_USE"),  # Terminal state
        ]
        
        print_info("Testing invalid transitions:")
        for current, new in invalid_tests:
            if not is_valid_transition(current, new):
                print_success(f"{current} → {new} (correctly rejected)")
            else:
                print_error(f"{current} → {new} (should be invalid)")
        
        # Test terminal states
        print_info("Testing terminal states:")
        for state in ["MANAGER_REJECTED", "IT_REJECTED", "CLOSED"]:
            if is_terminal_state(state):
                print_success(f"{state} is terminal")
            else:
                print_error(f"{state} should be terminal")
        
        return True
        
    except Exception as e:
        print_error(f"State machine test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_models():
    """Test database models"""
    print_section("3. DATABASE MODELS")
    
    try:
        from app.models.models import (
            AssetRequest, User, Asset, ByodDevice, ExitRequest,
            AssetAssignment, PurchaseRequest
        )
        
        # Check AssetRequest model has new fields
        import inspect
        ar_fields = [attr for attr in dir(AssetRequest) if not attr.startswith('_')]
        
        required_fields = [
            'qc_status', 'qc_performed_by', 'qc_performed_at', 'qc_notes',
            'user_acceptance_status', 'user_accepted_at',
            'procurement_finance_status', 'procurement_finance_reviewed_by',
            'procurement_finance_reviewed_at', 'procurement_finance_rejection_reason'
        ]
        
        print_info("Checking AssetRequest model fields:")
        all_present = True
        for field in required_fields:
            if hasattr(AssetRequest, field):
                print_success(f"Field '{field}' exists")
            else:
                print_error(f"Field '{field}' missing")
                all_present = False
        
        print_success("All models imported successfully")
        return all_present
        
    except Exception as e:
        print_error(f"Model test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_services():
    """Test service functions"""
    print_section("4. SERVICE FUNCTIONS")
    
    try:
        from app.services import asset_request_service
        
        # Check for new service functions
        service_functions = [
            'update_procurement_finance_status',
            'perform_qc_check',
            'update_user_acceptance',
            'update_it_review_status',
            'get_asset_request_by_id_db',
        ]
        
        print_info("Checking service functions:")
        all_present = True
        for func_name in service_functions:
            if hasattr(asset_request_service, func_name):
                print_success(f"Function '{func_name}' exists")
            else:
                print_error(f"Function '{func_name}' missing")
                all_present = False
        
        return all_present
        
    except Exception as e:
        print_error(f"Service test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_schemas():
    """Test Pydantic schemas"""
    print_section("5. SCHEMAS")
    
    try:
        from app.schemas.asset_request_schema import (
            ProcurementApprovalRequest,
            ProcurementRejectionRequest,
            QCPerformRequest,
            UserAcceptanceRequest,
            AssetRequestResponse
        )
        
        print_success("All new schemas imported")
        
        # Check AssetRequestResponse has new fields
        response_fields = AssetRequestResponse.model_fields.keys()
        required_fields = [
            'qc_status', 'qc_performed_by', 'qc_performed_at', 'qc_notes',
            'user_acceptance_status', 'user_accepted_at',
            'procurement_finance_status', 'procurement_finance_reviewed_by',
            'procurement_finance_reviewed_at', 'procurement_finance_rejection_reason'
        ]
        
        print_info("Checking AssetRequestResponse fields:")
        all_present = True
        for field in required_fields:
            if field in response_fields:
                print_success(f"Field '{field}' in response schema")
            else:
                print_error(f"Field '{field}' missing from response schema")
                all_present = False
        
        return all_present
        
    except Exception as e:
        print_error(f"Schema test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_routers():
    """Test router registration"""
    print_section("6. ROUTER ENDPOINTS")
    
    try:
        from app.routers import asset_requests, auth
        
        # Count routes
        ar_routes = len(asset_requests.router.routes)
        auth_routes = len(auth.router.routes)
        
        print_success(f"Asset requests router: {ar_routes} routes")
        print_success(f"Auth router: {auth_routes} routes")
        
        # Check for specific endpoints by examining route paths
        ar_paths = [str(route.path) for route in asset_requests.router.routes if hasattr(route, 'path')]
        
        expected_endpoints = [
            '/procurement/approve',
            '/procurement/reject',
            '/qc/perform',
            '/user/accept',
            '/user/reject',
        ]
        
        print_info("Checking for new endpoints:")
        found_count = 0
        for endpoint in expected_endpoints:
            found = any(endpoint in path for path in ar_paths)
            if found:
                print_success(f"Found endpoint: {endpoint}")
                found_count += 1
            else:
                print_error(f"Missing endpoint: {endpoint}")
        
        # Check exit endpoints
        auth_paths = [str(route.path) for route in auth.router.routes if hasattr(route, 'path')]
        exit_endpoints = ['/process-assets', '/process-byod', '/complete']
        
        print_info("Checking exit workflow endpoints:")
        for endpoint in exit_endpoints:
            found = any(endpoint in path for path in auth_paths)
            if found:
                print_success(f"Found exit endpoint: {endpoint}")
            else:
                print_error(f"Missing exit endpoint: {endpoint}")
        
        return found_count == len(expected_endpoints)
        
    except Exception as e:
        print_error(f"Router test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_database_connectivity():
    """Test database connectivity"""
    print_section("7. DATABASE CONNECTIVITY")
    
    try:
        from app.database.database import SessionLocal, engine
        from sqlalchemy import text
        
        # Test connection
        conn = engine.connect()
        result = conn.execute(text("SELECT 1"))
        conn.close()
        print_success("Database connection successful")
        
        # Test models
        db = SessionLocal()
        from app.models.models import User, AssetRequest, Asset
        
        try:
            user_count = db.query(User).count()
            print_success(f"Users table: {user_count} records")
        except Exception as e:
            print_error(f"Users query failed: {str(e)[:60]}")
        
        try:
            asset_count = db.query(Asset).count()
            print_success(f"Assets table: {asset_count} records")
        except Exception as e:
            print_error(f"Assets query failed: {str(e)[:60]}")
        
        try:
            request_count = db.query(AssetRequest).count()
            print_success(f"Asset requests table: {request_count} records")
        except Exception as e:
            print_error(f"Asset requests query failed: {str(e)[:60]}")
        
        db.close()
        return True
        
    except Exception as e:
        print_error(f"Database connectivity failed: {e}")
        return False

def main():
    """Run all tests"""
    print(f"\n{Colors.BLUE}{'='*70}{Colors.END}")
    print(f"{Colors.BLUE}{'COMPLETE BACKEND VALIDATION'.center(70)}{Colors.END}")
    print(f"{Colors.BLUE}{datetime.now().strftime('%Y-%m-%d %H:%M:%S').center(70)}{Colors.END}")
    print(f"{Colors.BLUE}{'='*70}{Colors.END}\n")
    
    results = {}
    
    results["Imports"] = test_imports()
    results["State Machine"] = test_state_machine()
    results["Models"] = test_models()
    results["Services"] = test_services()
    results["Schemas"] = test_schemas()
    results["Routers"] = test_routers()
    results["Database"] = test_database_connectivity()
    
    # Summary
    print_section("TEST SUMMARY")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = f"{Colors.GREEN}PASSED{Colors.END}" if result else f"{Colors.RED}FAILED{Colors.END}"
        print(f"  {test_name}: {status}")
    
    print(f"\n{Colors.BLUE}{'='*70}{Colors.END}")
    print(f"Total Tests: {total}")
    print(f"{Colors.GREEN}Passed: {passed}{Colors.END}")
    print(f"{Colors.RED}Failed: {total - passed}{Colors.END}")
    print(f"{Colors.BLUE}{'='*70}{Colors.END}\n")
    
    if passed == total:
        print(f"{Colors.GREEN}[OK] All backend validation tests PASSED!{Colors.END}\n")
        print(f"{Colors.CYAN}Backend is ready for use.{Colors.END}")
        print(f"{Colors.CYAN}Note: Restart server to see all endpoints in /docs{Colors.END}\n")
        return 0
    else:
        print(f"{Colors.RED}[FAIL] Some validation tests failed.{Colors.END}\n")
        return 1

if __name__ == "__main__":
    sys.exit(main())

