#!/usr/bin/env python3
"""
Complete end-to-end authentication flow test
Simulates what the frontend does:
1. Login
2. Save token
3. Call admin endpoint
"""
import requests
import json
import sys
import os
from datetime import datetime

from load_env import load_project_env

load_project_env()

API_URL = os.getenv("NEXT_PUBLIC_API_URL", "http://localhost:8000/api/v1")

TEST_EMAIL = os.getenv("TEST_EMAIL")
TEST_PASSWORD = os.getenv("TEST_PASSWORD")

if not TEST_EMAIL or not TEST_PASSWORD:
    print("ERROR: TEST_EMAIL and TEST_PASSWORD must be set in the root .env file")
    sys.exit(1)

print("=" * 100)
print("COMPLETE AUTHENTICATION FLOW TEST")
print("=" * 100)

# Step 1: Attempt login
print("\n[STEP 1] Attempting login...")
print("-" * 100)
print(f"POST {API_URL}/auth/login")
print(f"Body: {{email_or_instagram: '{TEST_EMAIL}', password: '***'}}")

try:
    response = requests.post(
        f"{API_URL}/auth/login",
        json={
            "email_or_instagram": TEST_EMAIL,
            "password": TEST_PASSWORD
        },
        timeout=5
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code != 200:
        print(f"❌ Login failed with status {response.status_code}")
        print(f"Response: {response.text}")
        sys.exit(1)
    
    data = response.json()
    print(f"✓ Login successful")
    
    # Check for token in response
    if not data.get('access_token'):
        print(f"❌ Authorization error: No access_token in response")
        print(f"Response keys: {list(data.keys())}")
        sys.exit(1)
    
    access_token = data['access_token']
    user_id = data['id']
    user_name = data['name']
    user_type = data.get('user_type', 'unknown')
    
    print(f"  - User: {user_name} (ID: {user_id})")
    print(f"  - Type: {user_type}")
    print(f"  - Token: {access_token[:50]}...")
    
    if user_type != 'admin':
        print(f"⚠️  WARNING: User is not admin (user_type='{user_type}')")
        print(f"   The admin endpoints will reject this user with 403 Forbidden")
    
except requests.exceptions.ConnectionError:
    print(f"❌ Connection error: Backend not running?")
    print(f"   Make sure the backend is running at {API_URL}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)

# Step 2: Try admin endpoint WITHOUT token
print("\n[STEP 2] Testing admin endpoint WITHOUT authentication...")
print("-" * 100)
endpoint = f"{API_URL}/admin/users?status=irregular"
print(f"GET {endpoint}")
print(f"Headers: (none)")

try:
    response = requests.get(endpoint, timeout=5)
    print(f"Status: {response.status_code}")
    if response.status_code == 401:
        print(f"✓ Correctly rejected (expected 401)")
    else:
        print(f"⚠️  Unexpected status: {response.status_code}")
    print(f"Response: {response.text[:200]}")
except Exception as e:
    print(f"❌ Error: {e}")

# Step 3: Try admin endpoint WITH token
print("\n[STEP 3] Testing admin endpoint WITH token from login...")
print("-" * 100)
print(f"GET {endpoint}")
print(f"Headers: Authorization: Bearer {access_token[:50]}...")

try:
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(endpoint, headers=headers, timeout=5)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ SUCCESS! Admin endpoint accessible")
        print(f"  - Total users: {data.get('total', 'unknown')}")
        print(f"  - Page: {data.get('page', 'unknown')}/{data.get('total_pages', 'unknown')}")
        if data.get('users'):
            user = data['users'][0]
            print(f"  - Sample user: {user.get('name', 'unknown')}")
            print(f"  - Experiments: {user.get('experimentos_criados_total', 'unknown')}")
    elif response.status_code == 401:
        print(f"❌ Authentication failed (401)")
        print(f"   The token from login is not accepted by admin endpoint")
        print(f"   Check DEBUG_401_ERROR.md for troubleshooting")
    elif response.status_code == 403:
        print(f"❌ Authorization failed (403)")
        print(f"   User is logged in but doesn't have admin permissions")
        print(f"   User type: {user_type}")
    else:
        print(f"❌ Unexpected status: {response.status_code}")
    
    print(f"Response: {response.text[:300]}")
    
except requests.exceptions.ConnectionError:
    print(f"❌ Connection error: Backend not running?")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()

# Step 4: Summary
print("\n" + "=" * 100)
print("TEST SUMMARY")
print("=" * 100)

print("""
✓ If you see this, the backend is running and login works
✓ If Step 3 shows 200 OK, the complete flow is working
❌ If Step 3 shows 401, check DEBUG_401_ERROR.md

The issue is likely one of:
1. Frontend not storing the token from login
2. Frontend not sending the token in the Authorization header
3. Backend using different JWT secret/algorithm for token generation
4. User account doesn't have admin privileges
""")
