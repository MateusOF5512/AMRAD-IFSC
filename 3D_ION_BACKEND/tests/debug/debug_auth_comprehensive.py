#!/usr/bin/env python3
"""
Comprehensive authentication debugging script
Tests the complete flow from token generation to API access
"""
import requests
import json
import sys
import os
from datetime import datetime, timedelta

# Add the app to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

try:
    from core.security import create_access_token, verify_jwt_token
    from core.config import settings
except ImportError as e:
    print(f"❌ ERROR: Could not import from app: {e}")
    print("Make sure you're running this from the AMRAD_BACKEND directory")
    sys.exit(1)

# Configuration
API_URL = "http://localhost:8000/api/v1"
TEST_USER_ID = "52d02837-4178-4e41-a89a-2d602c2933b7"  # MATEUS ORTIZ ADMIN
TEST_USER_EMAIL = "mateus1@gmail.com"  # MATEUS ORTIZ ADMIN email

print("=" * 100)
print("COMPREHENSIVE AUTHENTICATION DEBUG")
print("=" * 100)

# Print configuration
print("\n[CONFIG] JWT Settings:")
print(f"  - Algorithm: {settings.JWT_ALGORITHM}")
print(f"  - Secret: {settings.JWT_SECRET[:20]}...")
print(f"  - Expiration: {settings.JWT_EXPIRATION_HOURS} hours")

# Test 1: Create and verify token locally
print("\n" + "=" * 100)
print("[TEST 1] Local Token Creation and Verification")
print("=" * 100)
try:
    token = create_access_token(TEST_USER_ID, TEST_USER_EMAIL)
    print(f"✓ Token created successfully")
    print(f"  Token: {token[:50]}...")
    
    payload = verify_jwt_token(token)
    print(f"✓ Token verified locally")
    print(f"  Payload: {json.dumps(payload, indent=2, default=str)}")
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)

# Test 2: Request without authentication
print("\n" + "=" * 100)
print("[TEST 2] API Request WITHOUT Authentication")
print("=" * 100)
endpoint = f"{API_URL}/admin/users?status=irregular"
print(f"GET {endpoint}")
try:
    response = requests.get(endpoint, timeout=5)
    print(f"Status: {response.status_code}")
    if response.status_code == 401:
        print(f"✓ Correctly returned 401 (no auth)")
    print(f"Response: {response.text[:200]}")
except Exception as e:
    print(f"❌ Error: {e}")

# Test 3: Request with invalid token
print("\n" + "=" * 100)
print("[TEST 3] API Request with INVALID Token")
print("=" * 100)
headers = {"Authorization": "Bearer invalid_token_xyz"}
print(f"GET {endpoint}")
print(f"Headers: Authorization: Bearer invalid_token_xyz")
try:
    response = requests.get(endpoint, headers=headers, timeout=5)
    print(f"Status: {response.status_code}")
    if response.status_code == 401:
        print(f"✓ Correctly returned 401 (invalid token)")
    print(f"Response: {response.text[:200]}")
except Exception as e:
    print(f"❌ Error: {e}")

# Test 4: Request with valid but non-admin token
print("\n" + "=" * 100)
print("[TEST 4] API Request with VALID Token (non-admin user)")
print("=" * 100)
try:
    # Create token for non-admin user
    non_admin_token = create_access_token("some-other-id", "other@example.com")
    headers = {"Authorization": f"Bearer {non_admin_token}"}
    print(f"GET {endpoint}")
    print(f"Headers: Authorization: Bearer {non_admin_token[:30]}...")
    
    response = requests.get(endpoint, headers=headers, timeout=5)
    print(f"Status: {response.status_code}")
    if response.status_code == 401:
        print(f"✓ User not found in database (expected 401)")
    elif response.status_code == 403:
        print(f"✓ User is not admin (expected 403)")
    print(f"Response: {response.text[:300]}")
except Exception as e:
    print(f"❌ Error: {e}")

# Test 5: Request with valid admin token
print("\n" + "=" * 100)
print("[TEST 5] API Request with VALID Token (admin user)")
print("=" * 100)
try:
    headers = {"Authorization": f"Bearer {token}"}
    print(f"GET {endpoint}")
    print(f"Headers: Authorization: Bearer {token[:30]}...")
    
    response = requests.get(endpoint, headers=headers, timeout=5)
    print(f"Status: {response.status_code}")
    print(f"Response Preview: {response.text[:300]}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ SUCCESS! API responded with 200 OK")
        print(f"  Total users: {data.get('total', 'unknown')}")
        if data.get('users'):
            first_user = data['users'][0]
            print(f"  First user: {first_user.get('name', 'unknown')} ({first_user.get('email', 'unknown')})")
            print(f"  Experiments: {first_user.get('experimentos_criados_total', 'unknown')}")
    else:
        print(f"❌ API returned {response.status_code}")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()

# Test 6: Token expiration
print("\n" + "=" * 100)
print("[TEST 6] Token Expiration Check")
print("=" * 100)
try:
    payload = verify_jwt_token(token)
    exp_timestamp = payload.get('exp')
    iat_timestamp = payload.get('iat')
    
    if exp_timestamp and iat_timestamp:
        exp_datetime = datetime.fromtimestamp(exp_timestamp)
        iat_datetime = datetime.fromtimestamp(iat_timestamp)
        now = datetime.utcnow()
        
        print(f"Token issued at: {iat_datetime.isoformat()}")
        print(f"Token expires at: {exp_datetime.isoformat()}")
        print(f"Current time: {now.isoformat()}")
        
        if exp_datetime > now:
            remaining = exp_datetime - now
            print(f"✓ Token is valid for {remaining.total_seconds()/3600:.1f} more hours")
        else:
            print(f"❌ Token has expired!")
except Exception as e:
    print(f"❌ Error: {e}")

print("\n" + "=" * 100)
print("DEBUG COMPLETE")
print("=" * 100)
