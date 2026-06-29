"""
Test script to verify user_type field is returned in /admin/users endpoint
"""
import requests
import json
from datetime import datetime

# Get admin token from database
from app.database.supabase import get_supabase_client
from app.core.security import create_access_token

# Test configuration
API_URL = "http://127.0.0.1:8000/api/v1"

def get_admin_token():
    """Get token for an admin user"""
    supabase = get_supabase_client()
    
    # Find an admin user
    response = supabase.table("researchers").select("id, user_type").eq("user_type", "admin").limit(1).execute()
    
    if not response.data:
        print("❌ No admin users found in database")
        return None
    
    admin_user = response.data[0]
    admin_id = admin_user["id"]
    
    print(f"\n✓ Found admin user: {admin_id}")
    
    # Create token
    token = create_access_token({"sub": admin_id})
    print(f"✓ Created token for admin user")
    
    return token

def test_get_users():
    """Test GET /admin/users endpoint"""
    token = get_admin_token()
    
    if not token:
        return
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Test different status values
    for status in ["regular", "irregular", "desativado"]:
        print(f"\n{'='*60}")
        print(f"Testing: GET /admin/users?status={status}")
        print(f"{'='*60}")
        
        response = requests.get(
            f"{API_URL}/admin/users?status={status}&page=1&per_page=10",
            headers=headers
        )
        
        print(f"\nStatus Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✓ Response successful")
            print(f"Total users: {data.get('total', 0)}")
            print(f"Users returned: {len(data.get('users', []))}")
            
            if data.get('users'):
                print(f"\n📋 First user details:")
                first_user = data['users'][0]
                print(f"  - ID: {first_user.get('id')}")
                print(f"  - Name: {first_user.get('name')}")
                print(f"  - Email: {first_user.get('email')}")
                print(f"  - Status: {first_user.get('status')}")
                print(f"  - user_type: {first_user.get('user_type')} ⭐")
                print(f"  - Institución: {first_user.get('institution')}")
                print(f"  - Experimentos: {first_user.get('experimentos_criados_total')}")
                
                # Check all users for user_type
                print(f"\n📋 All users in this status:")
                for user in data['users']:
                    user_type = user.get('user_type', 'MISSING')
                    name = user.get('name', 'Unknown')
                    print(f"  - {name}: {user_type}")
        else:
            print(f"\n❌ Error: {response.status_code}")
            print(f"Response: {response.text}")

if __name__ == "__main__":
    print("\n" + "="*60)
    print("Testing user_type field in /admin/users endpoint")
    print("="*60)
    
    test_get_users()
