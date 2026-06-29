#!/usr/bin/env python
"""
Test script to check /admin/administrators endpoint
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.database.supabase import get_supabase_client
import json

def test_administrators_endpoint():
    """Test the administrators endpoint data"""
    supabase = get_supabase_client()
    
    print("=" * 80)
    print("Testing /admin/administrators endpoint data")
    print("=" * 80)
    
    try:
        # Fetch all admins
        print("\n[TEST] Fetching all admins from database...")
        response = supabase.table("researchers").select("id, name, email, user_type, institution, created_at").eq("user_type", "admin").execute()
        
        admins_data = response.data if response.data else []
        print(f"[TEST] Found {len(admins_data)} admins")
        
        for admin in admins_data:
            admin_id = admin.get("id")
            admin_name = admin.get("name")
            print(f"\n[TEST] Processing admin: {admin_name} (ID: {admin_id})")
            
            # Count experiments
            print(f"[TEST] Counting samples for {admin_name}...")
            samples_response = supabase.table("samples").select("id", count="exact").eq("researcher_id", admin_id).execute()
            
            print(f"[TEST] Raw samples_response: {samples_response}")
            print(f"[TEST] samples_response.count: {samples_response.count}")
            print(f"[TEST] Type of count: {type(samples_response.count)}")
            
            experiment_count = samples_response.count if samples_response.count is not None else 0
            experiment_count_int = int(experiment_count)
            
            print(f"[TEST] Final experiment_count: {experiment_count} (int: {experiment_count_int})")
            
            # Show what would be in response
            response_data = {
                "id": admin_id,
                "name": admin_name,
                "email": admin.get("email"),
                "user_type": admin.get("user_type"),
                "institution": admin.get("institution"),
                "experimentos_criados_total": experiment_count_int,
                "created_at": str(admin.get("created_at", ""))
            }
            print(f"[TEST] Response object: {json.dumps(response_data, indent=2)}")
        
        print("\n" + "=" * 80)
        print("Test completed successfully!")
        print("=" * 80)
        
    except Exception as e:
        print(f"\n[ERROR] Exception: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_administrators_endpoint()
