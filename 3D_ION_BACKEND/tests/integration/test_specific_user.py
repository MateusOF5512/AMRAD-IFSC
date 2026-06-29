#!/usr/bin/env python3
"""
Test specific user that should have experiments
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.database.supabase import get_supabase_client
import requests
from core.security import create_access_token

supabase = get_supabase_client()

# Test with MATEUS ORTIZ  ADMIN
TEST_USER_ID = "52d02837-4178-4e41-a89a-2d602c2933b7"
TEST_USER_EMAIL = "mateus1@gmail.com"

API_URL = "http://localhost:8000/api/v1"

print("=" * 80)
print("TESTING SPECIFIC USER WITH KNOWN EXPERIMENT COUNT")
print("=" * 80)

print(f"\nTest user: MATEUS ORTIZ  ADMIN")
print(f"ID: {TEST_USER_ID}")
print(f"Email: {TEST_USER_EMAIL}")
print(f"Expected: 2 experiments")

# Step 1: Verify database directly
print("\n[Step 1] Verify in database directly")
print("-" * 80)
try:
    response = supabase.table("samples").select("id", count="exact").eq("researcher_id", TEST_USER_ID).execute()
    db_count = response.count
    print(f"Database count: {db_count}")
except Exception as e:
    print(f"ERROR: {e}")
    db_count = None

# Step 2: Test admin endpoint with generated token
print("\n[Step 2] Call admin endpoint with token")
print("-" * 80)
try:
    token = create_access_token(TEST_USER_ID, TEST_USER_EMAIL)
    headers = {"Authorization": f"Bearer {token}"}
    
    # Fetch this specific status
    endpoint = f"{API_URL}/admin/users?status=irregular"
    response = requests.get(endpoint, headers=headers, timeout=5)
    
    print(f"API Response status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        users = data.get("users", [])
        
        # Find the test user in response
        test_user_in_response = None
        for user in users:
            if user.get("email") == TEST_USER_EMAIL:
                test_user_in_response = user
                break
        
        if test_user_in_response:
            api_count = test_user_in_response.get("experimentos_criados_total")
            print(f"API response count: {api_count}")
            
            print(f"\nComparison:")
            print(f"  Database: {db_count}")
            print(f"  API: {api_count}")
            print(f"  Match: {'✅' if db_count == api_count else '❌'}")
        else:
            print(f"User {TEST_USER_EMAIL} not found in API response")
            print(f"Users in response: {[u.get('email') for u in users]}")
    else:
        print(f"ERROR: {response.status_code}")
        print(f"Response: {response.text}")
        
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 80)
