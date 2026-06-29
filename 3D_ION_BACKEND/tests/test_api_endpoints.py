"""
Test API Endpoints (Optimized)
Tests HTTP endpoints of the FastAPI backend
Uses pre-existing JWT tokens to avoid creating new users and hitting rate limits
"""

import os
import json
import requests
import sys
from load_env import load_project_env

load_project_env()

# Enable UTF-8 encoding for Windows
if sys.platform == "win32":
    os.environ["PYTHONIOENCODING"] = "utf-8"

class TestAPIEndpoints:
    def __init__(self):
        self.base_url = os.getenv("API_URL", "http://localhost:8000")
        self.api_prefix = "/api/v1"
        self.full_url = f"{self.base_url}{self.api_prefix}"
        
        # Try to get JWT token from environment
        self.auth_token = os.getenv("TEST_JWT_TOKEN")
        self.test_user_id = os.getenv("TEST_USER_ID")
        
        if self.auth_token:
            print(f"\n[OK] Using JWT token from environment (first 20 chars: {self.auth_token[:20]}...)")
        else:
            print(f"\n[WARN] No TEST_JWT_TOKEN in .env - Auth tests will be skipped")
            print(f"   To enable auth tests, add TEST_JWT_TOKEN and TEST_USER_ID to .env")
    
    def test_health_check(self):
        """Test health check endpoint"""
        print("\n" + "="*60)
        print("TEST 1: Health Check Endpoint")
        print("="*60)
        
        try:
            response = requests.get(f"{self.base_url}/", timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                print(f"[PASS] Health check successful")
                print(f"  Status: {data.get('status')}")
                print(f"  Service: {data.get('service')}")
                print(f"  Version: {data.get('version')}")
                return True
            else:
                print(f"[FAIL] Health check failed: HTTP {response.status_code}")
                print(f"  Response: {response.text[:200]}")
                return False
                
        except requests.exceptions.Timeout:
            print(f"[FAIL] Health check timeout - backend may not be running")
            return False
        except Exception as e:
            print(f"[FAIL] Health check error: {str(e)}")
            print(f"  Make sure backend is running: python -m app.main")
            return False
    
    def test_authenticated_request(self):
        """Test authenticated request with pre-existing JWT"""
        print("\n" + "="*60)
        print("TEST 2: Authenticated Request (with JWT)")
        print("="*60)
        
        if not self.auth_token:
            print(f"[SKIP] No TEST_JWT_TOKEN in environment")
            print(f"   To test with authentication:")
            print(f"   1. Get a valid JWT token from Supabase")
            print(f"   2. Add TEST_JWT_TOKEN=<token> to .env")
            print(f"   3. Optionally add TEST_USER_ID=<user_id> to .env")
            return None  # Return None to indicate skipped test
        
        try:
            headers = {
                "Authorization": f"Bearer {self.auth_token}",
                "Content-Type": "application/json"
            }
            
            # GET request to materials endpoint
            response = requests.get(
                f"{self.full_url}/materials",
                headers=headers,
                timeout=5
            )
            
            if response.status_code == 200:
                print(f"[PASS] Authenticated request successful")
                data = response.json()
                print(f"  Materials count: {len(data) if isinstance(data, list) else 'N/A'}")
                if isinstance(data, list) and len(data) > 0:
                    print(f"  First item: {json.dumps(data[0], indent=2)[:150]}...")
                return True
            else:
                print(f"[FAIL] Authenticated request failed: HTTP {response.status_code}")
                print(f"  Response: {response.text[:200]}")
                return False
                
        except requests.exceptions.Timeout:
            print(f"[FAIL] Authenticated request timeout")
            return False
        except Exception as e:
            print(f"[FAIL] Authenticated request error: {str(e)}")
            return False
    
    def test_create_material(self):
        """Test creating a material via API"""
        print("\n" + "="*60)
        print("TEST 3: Create Material Endpoint")
        print("="*60)
        
        if not self.auth_token:
            print(f"[SKIP] No TEST_JWT_TOKEN in environment")
            return None
        
        try:
            material_data = {
                "brand": "API Test Brand",
                "model": "Test Model",
                "color": "Blue",
                "is_composite": False
            }
            
            headers = {
                "Authorization": f"Bearer {self.auth_token}",
                "Content-Type": "application/json"
            }
            
            response = requests.post(
                f"{self.full_url}/materials",
                json=material_data,
                headers=headers,
                timeout=5
            )
            
            if response.status_code in [200, 201]:
                print(f"[PASS] Material created successfully")
                data = response.json()
                print(f"  ID: {data.get('id', 'N/A')}")
                print(f"  Brand: {data.get('brand', 'N/A')}")
                return True
            else:
                print(f"[FAIL] Create material failed: HTTP {response.status_code}")
                print(f"  Response: {response.text[:200]}")
                return False
                
        except requests.exceptions.Timeout:
            print(f"[FAIL] Create material timeout")
            return False
        except Exception as e:
            print(f"[FAIL] Create material error: {str(e)}")
            return False
    
    def test_list_materials(self):
        """Test listing materials via API"""
        print("\n" + "="*60)
        print("TEST 4: List Materials Endpoint")
        print("="*60)
        
        if not self.auth_token:
            print(f"[SKIP] No TEST_JWT_TOKEN in environment")
            return None
        
        try:
            headers = {
                "Authorization": f"Bearer {self.auth_token}",
                "Content-Type": "application/json"
            }
            
            response = requests.get(
                f"{self.full_url}/materials",
                headers=headers,
                timeout=5
            )
            
            if response.status_code == 200:
                print(f"[PASS] Materials listed successfully")
                data = response.json()
                count = len(data) if isinstance(data, list) else 0
                print(f"  Total materials: {count}")
                if isinstance(data, list) and count > 0:
                    print(f"  Sample: {json.dumps(data[0], indent=2)[:150]}...")
                return True
            else:
                print(f"[FAIL] List materials failed: HTTP {response.status_code}")
                print(f"  Response: {response.text[:200]}")
                return False
                
        except requests.exceptions.Timeout:
            print(f"[FAIL] List materials timeout")
            return False
        except Exception as e:
            print(f"[FAIL] List materials error: {str(e)}")
            return False
    
    def test_unauthenticated_request(self):
        """Test unauthenticated request (should fail with 401)"""
        print("\n" + "="*60)
        print("TEST 5: Unauthenticated Request (Should Reject)")
        print("="*60)
        
        try:
            response = requests.get(
                f"{self.full_url}/materials",
                timeout=5
            )
            
            if response.status_code in [401, 403]:
                print(f"[PASS] Correctly rejected unauthenticated request")
                print(f"  Status: HTTP {response.status_code}")
                return True
            else:
                print(f"[WARN] Unexpected response: HTTP {response.status_code}")
                print(f"  Expected 401 or 403 (unauthorized)")
                print(f"  Response: {response.text[:200]}")
                return False
                
        except requests.exceptions.Timeout:
            print(f"[FAIL] Unauthenticated request timeout")
            return False
        except Exception as e:
            print(f"[FAIL] Unauthenticated request error: {str(e)}")
            return False
    
    def test_nonexistent_endpoint(self):
        """Test 404 handling"""
        print("\n" + "="*60)
        print("TEST 6: 404 Not Found Handling")
        print("="*60)
        
        try:
            response = requests.get(
                f"{self.full_url}/nonexistent-endpoint",
                timeout=5
            )
            
            if response.status_code == 404:
                print(f"[PASS] Correctly returned 404 for nonexistent endpoint")
                return True
            else:
                print(f"[WARN] Unexpected response: HTTP {response.status_code}")
                print(f"  Expected 404 (not found)")
                return False
                
        except requests.exceptions.Timeout:
            print(f"[FAIL] 404 test timeout")
            return False
        except Exception as e:
            print(f"[FAIL] 404 test error: {str(e)}")
            return False

def run_all_api_tests():
    """Run all API tests"""
    print("\n" + "="*60)
    print("RUNNING API ENDPOINT TESTS (OPTIMIZED)")
    print("="*60)
    print("\nThis test suite avoids creating new users to prevent hitting rate limits")
    print("To test authenticated endpoints, add TEST_JWT_TOKEN to .env")
    
    tester = TestAPIEndpoints()
    
    # Core tests that always run
    print("\n" + "-"*60)
    print("CORE TESTS (no authentication required)")
    print("-"*60)
    
    health_result = tester.test_health_check()
    unauth_result = tester.test_unauthenticated_request()
    not_found_result = tester.test_nonexistent_endpoint()
    
    # Optional auth tests
    print("\n" + "-"*60)
    print("OPTIONAL TESTS (require TEST_JWT_TOKEN in .env)")
    print("-"*60)
    
    auth_result = tester.test_authenticated_request()
    create_result = tester.test_create_material()
    list_result = tester.test_list_materials()
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    
    # Count passed/skipped/failed
    core_results = {
        "Health Check": health_result,
        "Unauthenticated Rejection": unauth_result,
        "404 Handling": not_found_result
    }
    
    optional_results = {}
    if auth_result is not None:
        optional_results["Authenticated Request"] = auth_result
    if create_result is not None:
        optional_results["Create Material"] = create_result
    if list_result is not None:
        optional_results["List Materials"] = list_result
    
    print("\nCore Tests (Required):")
    for test_name, result in core_results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"  {status}: {test_name}")
    
    if optional_results:
        print("\nAuthentication Tests (Optional):")
        for test_name, result in optional_results.items():
            status = "✓ PASS" if result else "✗ FAIL"
            print(f"  {status}: {test_name}")
    else:
        print("\n⏭️  Authentication Tests: SKIPPED (no TEST_JWT_TOKEN)")
    
    core_passed = all(core_results.values())
    optional_passed = all(optional_results.values()) if optional_results else True
    
    print("\n" + ("[OK] ALL TESTS PASSED" if (core_passed and optional_passed) else "[WARN] SOME CORE TESTS FAILED - See details above"))
    print("="*60)
    
    if not optional_results and health_result:
        print("\nTIP: To enable all tests, add this to .env:")
        print("   TEST_JWT_TOKEN=<your_valid_jwt_token>")
        print("   TEST_USER_ID=<your_user_id>")
    
    return core_passed

if __name__ == "__main__":
    print("\nNOTE: This test requires the backend running on http://localhost:8000")
    print("Start it with: python -m app.main")
    print("Or in production mode: .\\start_backend_production.bat")
    
    run_all_api_tests()
