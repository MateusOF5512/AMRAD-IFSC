#!/usr/bin/env python3
"""
Simulate the EXACT code from admin.py endpoint
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.database.supabase import get_supabase_client

supabase = get_supabase_client()

print("=" * 80)
print("SIMULATING EXACT ADMIN.PY ENDPOINT CODE")
print("=" * 80)

status_param = "irregular"
per_page = 10

print(f"\nFetching users with status='{status_param}'")
print("-" * 80)

try:
    # Exact code from admin.py
    users_query = supabase.table("researchers").select("*").eq("status", status_param)
    users_response = users_query.execute()
    all_users = users_response.data
    
    print(f"Found {len(all_users)} users with status '{status_param}'")
    
    # Get first 3 for testing
    paginated_users = all_users[:3]
    
    # Count samples for each user
    users_with_experiments = []
    
    print(f"\nCounting samples for first {len(paginated_users)} users:")
    print("-" * 80)
    
    for i, user in enumerate(paginated_users, 1):
        user_id = user.get("id")
        user_name = user.get("name", "Unknown")
        user_email = user.get("email", "Unknown")
        
        print(f"\n{i}. {user_name} ({user_email})")
        print(f"   User ID: {user_id}")
        
        experiment_count = 0
        
        # Exact code from admin.py
        try:
            print(f"   Executing: table('samples').select('id', count='exact').eq('researcher_id', '{user_id}')")
            samples_response = supabase.table("samples").select("id", count="exact").eq("researcher_id", user_id).execute()
            
            print(f"   Response type: {type(samples_response)}")
            print(f"   Response.count: {samples_response.count}")
            print(f"   Response.data: {samples_response.data}")
            
            experiment_count = samples_response.count if samples_response.count is not None else 0
            
            print(f"   Final count: {experiment_count}")
            
        except Exception as exp_error:
            print(f"   ERROR: {exp_error}")
            experiment_count = 0
        
        user["experimentos_criados_total"] = experiment_count
        users_with_experiments.append(user)
    
    # Show results
    print("\n" + "=" * 80)
    print("RESULTS")
    print("=" * 80)
    
    for user in users_with_experiments:
        print(f"\n{user['name']}")
        print(f"  Email: {user['email']}")
        print(f"  Status: {user['status']}")
        print(f"  Experiments: {user['experimentos_criados_total']}")
    
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 80)
