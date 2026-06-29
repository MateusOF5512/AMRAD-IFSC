#!/usr/bin/env python3
"""
Debug: Test how to properly count samples in Supabase
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.database.supabase import get_supabase_client

supabase = get_supabase_client()

# Test user that we know has samples
TEST_USER_ID = "52d02837-4178-4e41-a89a-2d602c2933b7"  # MATEUS ORTIZ ADMIN (should have 2)

print("=" * 80)
print("TESTING SAMPLE COUNTING METHODS")
print("=" * 80)

print(f"\nTesting user ID: {TEST_USER_ID}")
print(f"Expected: 2 samples in database")

# Method 1: Using count="exact" in select()
print("\n[METHOD 1] Using count='exact' in select()")
print("-" * 80)
try:
    response = supabase.table("samples").select("id", count="exact").eq("researcher_id", TEST_USER_ID).execute()
    print(f"Response: {response}")
    print(f"Response.count: {response.count}")
    print(f"Response.data: {response.data}")
    print(f"Result: count={response.count}")
except Exception as e:
    print(f"ERROR: {e}")

# Method 2: Using count="exact" without selecting any columns
print("\n[METHOD 2] Using count='exact' with empty select")
print("-" * 80)
try:
    response = supabase.table("samples").select("count").eq("researcher_id", TEST_USER_ID).execute()
    print(f"Response: {response}")
    print(f"Response.count: {response.count}")
    print(f"Result: count={response.count}")
except Exception as e:
    print(f"ERROR: {e}")

# Method 3: Fetch data and count locally
print("\n[METHOD 3] Fetch all data and count locally")
print("-" * 80)
try:
    response = supabase.table("samples").select("*").eq("researcher_id", TEST_USER_ID).execute()
    data = response.data
    count = len(data)
    print(f"Response.data length: {len(data)}")
    print(f"Records: {count}")
    if data:
        print(f"\nFirst sample:")
        print(f"  ID: {data[0].get('id')}")
        print(f"  researcher_id: {data[0].get('researcher_id')}")
    print(f"Result: count={count}")
except Exception as e:
    print(f"ERROR: {e}")

# Method 4: Using RPC function if available
print("\n[METHOD 4] Try different select format")
print("-" * 80)
try:
    response = supabase.table("samples").select().eq("researcher_id", TEST_USER_ID).execute()
    count = len(response.data) if response.data else 0
    print(f"Response count: {count}")
    print(f"Total records: {len(response.data) if response.data else 0}")
except Exception as e:
    print(f"ERROR: {e}")

print("\n" + "=" * 80)
print("RECOMMENDATION")
print("=" * 80)
print("""
If Method 3 and 4 work (count = 2):
  → Use: len(supabase.table("samples").select("*").eq("researcher_id", user_id).execute().data)
  
If only certain methods work:
  → Use that method in admin.py
""")
