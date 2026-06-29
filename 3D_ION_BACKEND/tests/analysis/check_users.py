#!/usr/bin/env python3
"""
Check what users exist in the database and their types
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.database.supabase import get_supabase_client

print("=" * 100)
print("CHECKING USERS IN DATABASE")
print("=" * 100)

supabase = get_supabase_client()

try:
    # Get all researchers
    response = supabase.table("researchers").select("id, email, name, user_type, status").execute()
    
    users = response.data
    print(f"\n✓ Found {len(users)} users in database")
    
    # Filter by user_type
    admins = [u for u in users if u.get('user_type') == 'admin']
    researchers = [u for u in users if u.get('user_type') == 'pesquisador']
    other = [u for u in users if u.get('user_type') not in ['admin', 'pesquisador']]
    
    print(f"\nUser breakdown:")
    print(f"  - Admins: {len(admins)}")
    print(f"  - Researchers: {len(researchers)}")
    print(f"  - Other: {len(other)}")
    
    if admins:
        print(f"\n[ADMINS]")
        for admin in admins[:5]:
            print(f"  - {admin['name']} ({admin['email']}) [ID: {admin['id'][:8]}...]")
    
    if researchers:
        print(f"\n[RESEARCHERS] (showing first 5)")
        for researcher in researchers[:5]:
            print(f"  - {researcher['name']} ({researcher['email']}) [ID: {researcher['id'][:8]}...]")
    
    print(f"\n[SUCCESS] Database connected and readable")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback
    traceback.print_exc()
