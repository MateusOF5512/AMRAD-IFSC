#!/usr/bin/env python3
"""
Simple test: Generate a token and test if it works with admin endpoint
"""
import sys
import os
import requests

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from core.security import create_access_token

API_URL = "http://localhost:8000/api/v1"
TEST_USER_ID = "52d02837-4178-4e41-a89a-2d602c2933b7"
TEST_USER_EMAIL = "mateus1@gmail.com"

print("=" * 80)
print("SIMPLE TOKEN TEST")
print("=" * 80)

# Generate token
print("\n[STEP 1] Generate JWT token...")
try:
    token = create_access_token(TEST_USER_ID, TEST_USER_EMAIL)
    print(f"OK - Token generated: {token[:50]}...")
except Exception as e:
    print(f"FAILED - {e}")
    sys.exit(1)

# Test admin endpoint with token
print("\n[STEP 2] Call admin endpoint with token...")
try:
    endpoint = f"{API_URL}/admin/users?status=irregular"
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(endpoint, headers=headers, timeout=5)
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"SUCCESS! Got {data.get('total', '?')} users")
        if data.get('users'):
            user = data['users'][0]
            print(f"  Example: {user.get('name')} - {user.get('experimentos_criados_total')} experiments")
    elif response.status_code == 401:
        print("FAILED - 401 Unauthorized")
        print(f"Response: {response.text[:200]}")
    else:
        print(f"ERROR - Status {response.status_code}")
        print(f"Response: {response.text[:200]}")
        
except Exception as e:
    print(f"FAILED - {e}")
    sys.exit(1)

print("\n" + "=" * 80)
