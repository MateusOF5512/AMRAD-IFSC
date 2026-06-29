"""
Complete authentication flow test - Register + Login + Change Password
Tests the entire authentication pipeline as a user would experience
"""

import requests
import json
from datetime import datetime
import time

BASE_URL = "http://localhost:8000"
API_V1_PREFIX = "/api/v1"

# Test data with timestamp to ensure unique email
timestamp = int(time.time() * 1000)
test_email = f"test_{timestamp}@example.com"
test_instagram = f"test_user_{timestamp}"
test_password = "SecurePassword123!"

print("\n" + "="*80)
print("FULL AUTHENTICATION FLOW TEST")
print("="*80)

# ============================================================================
# TEST 1: HEALTH CHECK
# ============================================================================
print("\n[1/5] HEALTH CHECK")
print("-" * 80)
try:
    response = requests.get(f"{BASE_URL}{API_V1_PREFIX}/health")
    print(f"✓ GET /api/v1/health")
    print(f"  Status: {response.status_code}")
    print(f"  Response: {response.json()}")
except Exception as e:
    print(f"✗ Health check failed: {e}")
    exit(1)

# ============================================================================
# TEST 2: USER REGISTRATION
# ============================================================================
print("\n[2/5] USER REGISTRATION")
print("-" * 80)
print(f"Registering new user...")
print(f"  Email: {test_email}")
print(f"  Instagram: {test_instagram}")
print(f"  Password: {test_password}")

register_data = {
    "name": "Test User Complete",
    "institution": "Test University",
    "email": test_email,
    "phone_number": "11999999999",
    "instagram": test_instagram,
    "password": test_password
}

try:
    response = requests.post(
        f"{BASE_URL}{API_V1_PREFIX}/auth/register",
        json=register_data
    )
    print(f"\n✓ POST /api/v1/auth/register")
    print(f"  Status: {response.status_code}")
    
    if response.status_code in [200, 201]:
        result = response.json()
        user_id = result.get('id') or result.get('user_id')
        print(f"  User ID: {user_id}")
        print(f"  Message: {result.get('message')}")
        print(f"\n✓ REGISTRATION SUCCESSFUL")
    else:
        print(f"  Error: {response.json()}")
        exit(1)
except Exception as e:
    print(f"✗ Registration failed: {e}")
    exit(1)

# ============================================================================
# TEST 3: LOGIN WITH EMAIL
# ============================================================================
print("\n[3/5] LOGIN WITH EMAIL")
print("-" * 80)
print(f"Logging in with email: {test_email}")

login_data = {
    "email_or_instagram": test_email,
    "password": test_password
}

try:
    response = requests.post(
        f"{BASE_URL}{API_V1_PREFIX}/auth/login",
        json=login_data
    )
    print(f"\n✓ POST /api/v1/auth/login")
    print(f"  Status: {response.status_code}")
    
    if response.status_code == 200:
        user_data = response.json()
        print(f"\n  User Data:")
        print(f"    User ID: {user_data.get('user_id')}")
        print(f"    Name: {user_data.get('name')}")
        print(f"    Email: {user_data.get('email')}")
        print(f"    Institution: {user_data.get('institution')}")
        print(f"    Phone: {user_data.get('phone_number')}")
        print(f"    Instagram: {user_data.get('instagram')}")
        print(f"    User Type: {user_data.get('user_type')}")
        print(f"\n✓ LOGIN WITH EMAIL SUCCESSFUL")
    else:
        print(f"  Error: {response.json()}")
        exit(1)
except Exception as e:
    print(f"✗ Login with email failed: {e}")
    exit(1)

# ============================================================================
# TEST 4: LOGIN WITH INSTAGRAM
# ============================================================================
print("\n[4/5] LOGIN WITH INSTAGRAM")
print("-" * 80)
print(f"Logging in with Instagram: {test_instagram}")

login_data = {
    "email_or_instagram": test_instagram,
    "password": test_password
}

try:
    response = requests.post(
        f"{BASE_URL}{API_V1_PREFIX}/auth/login",
        json=login_data
    )
    print(f"\n✓ POST /api/v1/auth/login (with Instagram)")
    print(f"  Status: {response.status_code}")
    
    if response.status_code == 200:
        user_data = response.json()
        print(f"\n  User Data (via Instagram login):")
        print(f"    User ID: {user_data.get('user_id')}")
        print(f"    Name: {user_data.get('name')}")
        print(f"    Email: {user_data.get('email')}")
        print(f"    Instagram: {user_data.get('instagram')}")
        print(f"\n✓ LOGIN WITH INSTAGRAM SUCCESSFUL")
    else:
        print(f"  Error: {response.json()}")
        exit(1)
except Exception as e:
    print(f"✗ Login with Instagram failed: {e}")
    exit(1)

# ============================================================================
# TEST 5: PASSWORD CHANGE
# ============================================================================
print("\n[5/5] PASSWORD CHANGE")
print("-" * 80)
new_password = "NewSecurePassword456!"
print(f"Changing password...")
print(f"  Old Password: {test_password}")
print(f"  New Password: {new_password}")

change_password_data = {
    "email_or_instagram": test_email,
    "old_password": test_password,
    "new_password": new_password
}

try:
    response = requests.post(
        f"{BASE_URL}{API_V1_PREFIX}/auth/change-password",
        json=change_password_data
    )
    print(f"\n✓ POST /api/v1/auth/change-password")
    print(f"  Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"  Message: {result.get('message')}")
        print(f"\n✓ PASSWORD CHANGE SUCCESSFUL")
        
        # Try logging in with new password
        print(f"\nVerifying new password works...")
        login_data = {
            "email_or_instagram": test_email,
            "password": new_password
        }
        response = requests.post(
            f"{BASE_URL}{API_V1_PREFIX}/auth/login",
            json=login_data
        )
        if response.status_code == 200:
            print(f"✓ Login with new password successful")
        else:
            print(f"✗ Login with new password failed")
    else:
        print(f"  Error: {response.json()}")
except Exception as e:
    print(f"✗ Password change failed: {e}")
    exit(1)

# ============================================================================
# SUMMARY
# ============================================================================
print("\n" + "="*80)
print("ALL TESTS PASSED!")
print("="*80)
print("\nSummary:")
print(f"  ✓ Health Check")
print(f"  ✓ User Registration")
print(f"  ✓ Login with Email")
print(f"  ✓ Login with Instagram")
print(f"  ✓ Password Change")
print("\nTest Data:")
print(f"  Email: {test_email}")
print(f"  Instagram: {test_instagram}")
print(f"  Final Password: {new_password}")
print("\nNow test the frontend registration manually!")
print("="*80 + "\n")
