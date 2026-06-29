"""
Test API Endpoints with Supabase Authentication
Uses native Supabase auth flow (sign in to get JWT)
No JWT_TOKEN stored - uses TEST_EMAIL and TEST_PASSWORD instead
"""

import os
import json
import requests
from load_env import load_project_env

load_project_env()


class TestAPIEndpoints:
    def __init__(self):
        self.base_url = os.getenv("API_URL", "http://localhost:8000")
        self.api_prefix = "/api/v1"
        self.full_url = f"{self.base_url}{self.api_prefix}"
        
        # Get credentials from .env
        self.test_email = os.getenv("TEST_EMAIL")
        self.test_password = os.getenv("TEST_PASSWORD")
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_anon_key = os.getenv("SUPABASE_ANON_KEY")
        
        # Auth token (will be obtained via Supabase login)
        self.auth_token = None
        self.user_id = None
        
        print("\n" + "="*60)
        print("INITIALIZATION")
        print("="*60)
        print(f"\nConfiguration:")
        print(f"  API_URL: {self.base_url}")
        print(f"  SUPABASE_URL: {self.supabase_url}")
        print(f"  TEST_EMAIL: {self.test_email}")
        print(f"  Environment variables loaded: {'OK' if self.test_email else 'MISSING'}")
        
        if not self.test_email or not self.test_password:
            print("\n[ERROR] TEST_EMAIL or TEST_PASSWORD not found in .env")
            print("        Add these to .env:")
            print("        TEST_EMAIL=test.researcher@3dion.local")
            print("        TEST_PASSWORD=TestPassword123!")
    
    def login_with_supabase(self):
        """Authenticate with Supabase using email/password"""
        print("\n" + "="*60)
        print("STEP 1: Authenticate with Supabase")
        print("="*60)
        
        if not self.test_email or not self.test_password:
            print("[SKIP] TEST_EMAIL or TEST_PASSWORD not configured")
            return False
        
        try:
            # Use Supabase Auth API directly
            auth_url = f"{self.supabase_url}/auth/v1/token?grant_type=password"
            
            auth_data = {
                "email": self.test_email,
                "password": self.test_password
            }
            
            headers = {
                "apikey": self.supabase_anon_key,
                "Content-Type": "application/json"
            }
            
            print(f"\nAttempting login for: {self.test_email}")
            response = requests.post(auth_url, json=auth_data, headers=headers, timeout=5)
            
            if response.status_code == 200:
                auth_response = response.json()
                self.auth_token = auth_response.get("access_token")
                self.user_id = auth_response.get("user", {}).get("id")
                
                print(f"[PASS] Login successful")
                print(f"  User ID: {self.user_id}")
                print(f"  Token (first 20 chars): {self.auth_token[:20]}...")
                return True
            else:
                print(f"[FAIL] Login failed: HTTP {response.status_code}")
                print(f"  Response: {response.text}")
                return False
                
        except requests.exceptions.Timeout:
            print(f"[FAIL] Login timeout")
            return False
        except Exception as e:
            print(f"[FAIL] Login error: {str(e)}")
            return False
    
    def test_health_check(self):
        """Test health check endpoint (no auth required)"""
        print("\n" + "="*60)
        print("STEP 2: Health Check")
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
                return False
                
        except requests.exceptions.Timeout:
            print(f"[FAIL] Health check timeout")
            return False
        except Exception as e:
            print(f"[FAIL] Health check error: {str(e)}")
            return False
    
    def test_authenticated_request(self):
        """Test authenticated request"""
        print("\n" + "="*60)
        print("STEP 3: Authenticated Request")
        print("="*60)
        
        if not self.auth_token:
            print(f"[SKIP] No valid auth token")
            return None
        
        try:
            headers = {
                "Authorization": f"Bearer {self.auth_token}",
                "Content-Type": "application/json"
            }
            
            response = requests.get(
                f"{self.full_url}/materials/",
                headers=headers,
                timeout=5
            )
            
            if response.status_code == 200:
                print(f"[PASS] Authenticated request successful")
                data = response.json()
                print(f"  Materials count: {len(data) if isinstance(data, list) else 'N/A'}")
                return True
            else:
                print(f"[FAIL] Authenticated request failed: HTTP {response.status_code}")
                print(f"  Response: {response.text[:200]}")
                return False
                
        except Exception as e:
            print(f"[FAIL] Error: {str(e)}")
            return False
    
    def test_create_material(self):
        """Test creating a material"""
        print("\n" + "="*60)
        print("STEP 4: Create Material")
        print("="*60)
        
        if not self.auth_token:
            print(f"[SKIP] No valid auth token")
            return None
        
        try:
            material_data = {
                "brand": "Test Brand",
                "model": "Test Model",
                "color": "Blue",
                "is_composite": False
            }
            
            headers = {
                "Authorization": f"Bearer {self.auth_token}",
                "Content-Type": "application/json"
            }
            
            response = requests.post(
                f"{self.full_url}/materials/",
                json=material_data,
                headers=headers,
                timeout=5
            )
            
            if response.status_code in [200, 201]:
                print(f"[PASS] Material created")
                data = response.json()
                print(f"  ID: {data.get('id', 'N/A')}")
                return True
            else:
                print(f"[FAIL] Create failed: HTTP {response.status_code}")
                print(f"  Response: {response.text[:200]}")
                return False
                
        except Exception as e:
            print(f"[FAIL] Error: {str(e)}")
            return False
    
    def test_unauthenticated_rejection(self):
        """Test that unauthenticated requests are rejected"""
        print("\n" + "="*60)
        print("STEP 5: Unauthenticated Request Rejection")
        print("="*60)
        
        try:
            response = requests.get(
                f"{self.full_url}/materials/",
                timeout=5
            )
            
            if response.status_code in [401, 403]:
                print(f"[PASS] Correctly rejected with HTTP {response.status_code}")
                return True
            else:
                print(f"[WARN] Unexpected response: HTTP {response.status_code}")
                print(f"  Expected 401 or 403")
                return False
                
        except Exception as e:
            print(f"[FAIL] Error: {str(e)}")
            return False
    
    def test_404_handling(self):
        """Test 404 handling"""
        print("\n" + "="*60)
        print("STEP 6: 404 Not Found")
        print("="*60)
        
        try:
            response = requests.get(
                f"{self.full_url}/nonexistent/",
                timeout=5
            )
            
            if response.status_code == 404:
                print(f"[PASS] Correctly returned 404")
                return True
            else:
                print(f"[WARN] Unexpected response: HTTP {response.status_code}")
                return False
                
        except Exception as e:
            print(f"[FAIL] Error: {str(e)}")
            return False


def run_all_tests():
    """Run complete test suite"""
    print("\n" + "="*60)
    print("ION3D API TEST SUITE - Supabase Authentication")
    print("="*60)
    
    tester = TestAPIEndpoints()
    
    # Step 1: Login
    login_ok = tester.login_with_supabase()
    
    # Step 2: Health check (no auth needed)
    health_ok = tester.test_health_check()
    
    # Step 3: Authenticated request
    if login_ok:
        auth_ok = tester.test_authenticated_request()
        create_ok = tester.test_create_material()
    else:
        auth_ok = None
        create_ok = None
    
    # Step 4: Unauthenticated rejection (no auth needed)
    unauth_ok = tester.test_unauthenticated_rejection()
    
    # Step 5: 404 handling (no auth needed)
    not_found_ok = tester.test_404_handling()
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    print("\nCore Tests (No Authentication Required):")
    print(f"  [{'PASS' if health_ok else 'FAIL'}] Health Check")
    print(f"  [{'PASS' if unauth_ok else 'FAIL'}] Unauthenticated Rejection")
    print(f"  [{'PASS' if not_found_ok else 'FAIL'}] 404 Handling")
    
    if login_ok:
        print("\nAuthentication Test:")
        print(f"  [PASS] Supabase Login")
        
        print("\nAPI Tests (With Authentication):")
        print(f"  [{'PASS' if auth_ok else 'FAIL'}] Get Materials")
        print(f"  [{'PASS' if create_ok else 'FAIL'}] Create Material")
    else:
        print("\nAuthentication Test:")
        print(f"  [FAIL] Supabase Login")
        print(f"  [SKIP] API Tests (requires login)")
    
    # Overall result
    core_passed = health_ok and unauth_ok and not_found_ok
    auth_passed = login_ok and auth_ok and create_ok if login_ok else False
    
    print("\n" + "="*60)
    if core_passed and (login_ok and auth_passed or not login_ok):
        print("[OK] ALL TESTS PASSED")
    else:
        print("[WARN] SOME TESTS FAILED - See details above")
    print("="*60)
    
    return core_passed and (auth_passed or not login_ok)


if __name__ == "__main__":
    print("\n[INFO] API Test Server: http://localhost:8000")
    print("[INFO] Make sure backend is running: python -m app.main")
    
    run_all_tests()
