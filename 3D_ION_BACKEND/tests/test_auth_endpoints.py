"""
Test Authentication Endpoints (Register & Login)
Tests user registration and login using researchers table
"""

import os
import requests
import time
from load_env import load_project_env

load_project_env()

class TestAuthEndpoints:
    def __init__(self):
        self.base_url = os.getenv("API_URL", "http://localhost:8000")
        self.api_prefix = "/api/v1"
        self.full_url = f"{self.base_url}{self.api_prefix}"
        self.auth_token = None
        self.user_id = None
        
        print("\n" + "="*60)
        print("AUTHENTICATION ENDPOINTS TEST")
        print("="*60)
        print(f"\nAPI URL: {self.base_url}")
    
    def test_health(self):
        """Test health check"""
        print("\n" + "="*60)
        print("TEST 1: Health Check")
        print("="*60)
        
        try:
            response = requests.get(f"{self.base_url}/", timeout=5)
            if response.status_code == 200:
                print("[PASS] Health check OK")
                return True
            else:
                print(f"[FAIL] Health check failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"[FAIL] Error: {str(e)}")
            return False
    
    def test_register(self):
        """Test user registration"""
        print("\n" + "="*60)
        print("TEST 2: User Registration")
        print("="*60)
        
        # Create unique test user
        timestamp = str(int(time.time()))
        test_email = f"test_user_{timestamp}@example.com"
        test_instagram = f"test_user_{timestamp}"
        
        register_data = {
            "name": "Test Researcher",
            "institution": "IFSC",
            "email": test_email,
            "phone_number": "11999999999",
            "password": "TestPassword123!",
            "instagram": test_instagram
        }
        
        print(f"\nRegistering user: {test_email}")
        
        try:
            response = requests.post(
                f"{self.full_url}/auth/register",
                json=register_data,
                timeout=5
            )
            
            if response.status_code in [201, 200]:
                data = response.json()
                print(f"[PASS] Registration successful")
                print(f"  User ID: {data.get('id')}")
                print(f"  Name: {data.get('name')}")
                print(f"  Email: {data.get('email')}")
                self.test_email = test_email
                self.test_password = register_data["password"]
                self.test_instagram = test_instagram
                return True
            else:
                print(f"[FAIL] Registration failed: {response.status_code}")
                print(f"  Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"[FAIL] Error: {str(e)}")
            return False
    
    def test_register_duplicate(self):
        """Test duplicate email prevention"""
        print("\n" + "="*60)
        print("TEST 3: Duplicate Email Prevention")
        print("="*60)
        
        if not hasattr(self, 'test_email'):
            print("[SKIP] No test email from previous test")
            return None
        
        duplicate_data = {
            "name": "Another User",
            "institution": "UFSC",
            "email": self.test_email,  # Same email
            "phone_number": "11888888888",
            "password": "DifferentPassword123!"
        }
        
        try:
            response = requests.post(
                f"{self.full_url}/auth/register",
                json=duplicate_data,
                timeout=5
            )
            
            if response.status_code == 409:
                print("[PASS] Correctly rejected duplicate email")
                return True
            else:
                print(f"[FAIL] Expected 409, got {response.status_code}")
                return False
                
        except Exception as e:
            print(f"[FAIL] Error: {str(e)}")
            return False
    
    def test_login_with_email(self):
        """Test login with email"""
        print("\n" + "="*60)
        print("TEST 4: Login with Email")
        print("="*60)
        
        if not hasattr(self, 'test_email'):
            print("[SKIP] No test email from registration")
            return None
        
        login_data = {
            "email_or_instagram": self.test_email,
            "password": self.test_password
        }
        
        print(f"\nLogging in with email: {self.test_email}")
        
        try:
            response = requests.post(
                f"{self.full_url}/auth/login",
                json=login_data,
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"[PASS] Login successful")
                print(f"  User ID: {data.get('id')}")
                print(f"  Name: {data.get('name')}")
                self.user_id = data.get('id')
                return True
            else:
                print(f"[FAIL] Login failed: {response.status_code}")
                print(f"  Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"[FAIL] Error: {str(e)}")
            return False
    
    def test_login_with_instagram(self):
        """Test login with Instagram handle"""
        print("\n" + "="*60)
        print("TEST 5: Login with Instagram")
        print("="*60)
        
        if not hasattr(self, 'test_instagram'):
            print("[SKIP] No test Instagram from registration")
            return None
        
        login_data = {
            "email_or_instagram": self.test_instagram,
            "password": self.test_password
        }
        
        print(f"\nLogging in with Instagram: @{self.test_instagram}")
        
        try:
            response = requests.post(
                f"{self.full_url}/auth/login",
                json=login_data,
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"[PASS] Login with Instagram successful")
                print(f"  User ID: {data.get('id')}")
                print(f"  User Type: {data.get('user_type')}")
                return True
            else:
                print(f"[FAIL] Login failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"[FAIL] Error: {str(e)}")
            return False
    
    def test_login_invalid_password(self):
        """Test login with invalid password"""
        print("\n" + "="*60)
        print("TEST 6: Invalid Password Rejection")
        print("="*60)
        
        if not hasattr(self, 'test_email'):
            print("[SKIP] No test email from registration")
            return None
        
        login_data = {
            "email_or_instagram": self.test_email,
            "password": "WrongPassword123!"
        }
        
        try:
            response = requests.post(
                f"{self.full_url}/auth/login",
                json=login_data,
                timeout=5
            )
            
            if response.status_code == 401:
                print("[PASS] Correctly rejected invalid password")
                return True
            else:
                print(f"[FAIL] Expected 401, got {response.status_code}")
                return False
                
        except Exception as e:
            print(f"[FAIL] Error: {str(e)}")
            return False
    
    def test_login_nonexistent(self):
        """Test login with nonexistent user"""
        print("\n" + "="*60)
        print("TEST 7: Nonexistent User Rejection")
        print("="*60)
        
        login_data = {
            "email_or_instagram": "nonexistent@example.com",
            "password": "Any Password456!"
        }
        
        try:
            response = requests.post(
                f"{self.full_url}/auth/login",
                json=login_data,
                timeout=5
            )
            
            if response.status_code == 401:
                print("[PASS] Correctly rejected nonexistent user")
                return True
            else:
                print(f"[FAIL] Expected 401, got {response.status_code}")
                return False
                
        except Exception as e:
            print(f"[FAIL] Error: {str(e)}")
            return False


def run_all_tests():
    """Run complete authentication test suite"""
    tester = TestAuthEndpoints()
    
    # Run tests
    health = tester.test_health()
    register = tester.test_register()
    duplicate = tester.test_register_duplicate()
    login_email = tester.test_login_with_email()
    login_ig = tester.test_login_with_instagram()
    invalid_pwd = tester.test_login_invalid_password()
    nonexistent = tester.test_login_nonexistent()
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    results = {
        "Health Check": health,
        "User Registration": register,
        "Duplicate Email Prevention": duplicate,
        "Login with Email": login_email,
        "Login with Instagram": login_ig,
        "Invalid Password Rejection": invalid_pwd,
        "Nonexistent User Rejection": nonexistent
    }
    
    for test_name, result in results.items():
        if result is None:
            status = "[SKIP]"
        elif result:
            status = "[PASS]"
        else:
            status = "[FAIL]"
        print(f"  {status}: {test_name}")
    
    # Count results
    passed = sum(1 for r in results.values() if r is True)
    failed = sum(1 for r in results.values() if r is False)
    skipped = sum(1 for r in results.values() if r is None)
    
    print(f"\nResults: {passed} Passed, {failed} Failed, {skipped} Skipped")
    print("="*60)
    
    return failed == 0


if __name__ == "__main__":
    print("\n[INFO] Testing Authentication Endpoints")
    print("[INFO] Backend must be running: python -m app.main")
    
    run_all_tests()
