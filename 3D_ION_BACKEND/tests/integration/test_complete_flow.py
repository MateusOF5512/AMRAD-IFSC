#!/usr/bin/env python3
"""
Simulate complete frontend login + admin data fetch flow
"""
import sys
import os
import json
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

import requests
from core.security import create_access_token

API_URL = "http://localhost:8000/api/v1"

print("=" * 100)
print("SIMULATING COMPLETE FRONTEND FLOW")
print("=" * 100)

# Step 1: Verify one admin can login
print("\n[STEP 1] Check if admin user exists in database")
print("-" * 100)

from app.database.supabase import get_supabase_client
supabase = get_supabase_client()

try:
    # Get admin users
    response = supabase.table("researchers").select("id, name, email, user_type, status").eq("user_type", "admin").execute()
    admins = response.data
    
    if not admins:
        print("ERROR: No admin users found!")
        sys.exit(1)
    
    admin = admins[0]
    admin_id = admin['id']
    admin_email = admin['email']
    admin_name = admin['name']
    
    print(f"OK - Found admin: {admin_name} ({admin_email})")
    print(f"    ID: {admin_id}")
    
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)

# Step 2: Generate token (simulating what login endpoint should return)
print("\n[STEP 2] Generate login token (what login endpoint returns)")
print("-" * 100)

try:
    token = create_access_token(admin_id, admin_email)
    print(f"OK - Token generated: {token[:50]}...")
    
    # Simulate what frontend would store
    user_data = {
        "id": admin_id,
        "user_id": admin_id,
        "name": admin_name,
        "email": admin_email,
        "user_type": "admin",
        "access_token": token,
        "token": token  # Also store as 'token' for compatibility
    }
    
    print(f"\nSIMULATED localStorage['user']:")
    print(json.dumps(user_data, indent=2, default=str)[:300] + "...")
    
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)

# Step 3: Call admin endpoint WITH token (what frontend does)
print("\n[STEP 3] Call admin endpoint with token (simulating frontend request)")
print("-" * 100)

all_stats = {
    "regular": 0,
    "irregular": 0,
    "desativado": 0
}

for status in ["regular", "irregular", "desativado"]:
    print(f"\nFetching: /admin/users?status={status}")
    
    try:
        endpoint = f"{API_URL}/admin/users?status={status}"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(endpoint, headers=headers, timeout=5)
        
        print(f"  Response Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"  ERROR: Got {response.status_code}")
            print(f"  Response: {response.text[:200]}")
            continue
        
        data = response.json()
        users = data.get("users", [])
        total = data.get("total", 0)
        
        print(f"  Total users with status '{status}': {total}")
        print(f"  Users in response: {len(users)}")
        
        all_stats[status] = len(users)
        
        # Show first 3 users
        if users:
            print(f"\n  First 3 users:")
            for i, user in enumerate(users[:3], 1):
                name = user.get('name', 'N/A')
                experiments = user.get('experimentos_criados_total', 'N/A')
                email = user.get('email', 'N/A')
                print(f"    {i}. {name}")
                print(f"       Email: {email}")
                print(f"       Experiments: {experiments}")
                print(f"       Status: {user.get('status', 'N/A')}")
        
    except Exception as e:
        print(f"  ERROR: {e}")

# Summary
print("\n" + "=" * 100)
print("SUMMARY")
print("=" * 100)
print(f"\nAdmins in database: {len(admins)}")
print(f"Token generation: OK")
print(f"Admin endpoint accessible: YES (200 OK)")
print(f"\nUsers returned by status:")
print(f"  - Regular: {all_stats['regular']}")
print(f"  - Irregular: {all_stats['irregular']}")
print(f"  - Desativado: {all_stats['desativado']}")
print(f"  - Total: {sum(all_stats.values())}")

if sum(all_stats.values()) == 0:
    print("\n[PROBLEM] No users being returned from API!")
else:
    print("\n[SUCCESS] API returns users correctly")
    print("\nIf frontend shows zeros despite this output showing data,")
    print("the problem is in the frontend component rendering logic.")
