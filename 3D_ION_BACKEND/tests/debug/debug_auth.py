#!/usr/bin/env python3
"""
Debug script to test authentication on admin endpoints
"""
import requests
import json
import sys
import os

# Add the app to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from core.security import create_access_token

# Configuration
API_URL = "http://localhost:8000/api/v1"
TEST_USER_ID = "52d02837-4178-4e41-a89a-2d602c2933b7"  # MATEUS ORTIZ ADMIN

print("=" * 80)
print("ADMIN ENDPOINT AUTHENTICATION DEBUG")
print("=" * 80)

# Test 1: Without authentication
print("\n[TEST 1] Request WITHOUT authentication header")
print("-" * 80)
endpoint = f"{API_URL}/admin/users?status=irregular"
print(f"URL: {endpoint}")
print(f"Headers: {{}}")
try:
    response = requests.get(endpoint)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:200]}")
except Exception as e:
    print(f"Error: {e}")

# Test 2: With invalid token
print("\n[TEST 2] Request WITH invalid token")
print("-" * 80)
headers = {"Authorization": "Bearer invalid_token_xyz"}
print(f"URL: {endpoint}")
print(f"Headers: {headers}")
try:
    response = requests.get(endpoint, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:200]}")
except Exception as e:
    print(f"Error: {e}")

# Test 3: With valid token (created on the fly)
print("\n[TEST 3] Request WITH valid token (generated)")
print("-" * 80)
try:
    # Create a valid token
    token = create_access_token({"sub": str(TEST_USER_ID), "user_type": "admin"})
    print(f"Generated token: {token[:50]}...")
    
    headers = {"Authorization": f"Bearer {token}"}
    print(f"URL: {endpoint}")
    print(f"Headers: Authorization: Bearer {token[:30]}...")
    
    response = requests.get(endpoint, headers=headers)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Success! Response contains {data.get('total', 'unknown')} users")
        if data.get('users'):
            print(f"  First user: {data['users'][0].get('name', 'unknown')}")
    else:
        print(f"✗ Failed with status {response.status_code}")
        print(f"  Response: {response.text[:200]}")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 80)
print("DEBUG COMPLETE")
print("=" * 80)
