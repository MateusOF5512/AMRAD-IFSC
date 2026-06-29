#!/usr/bin/env python
"""
Direct HTTP test using curl-equivalent to check what the server actually returns
"""
import requests
import json
import os
from load_env import load_project_env

load_project_env()

# Backend URL
BACKEND_URL = os.getenv("VITE_API_URL", "http://localhost:8000")

def test_endpoint():
    print("=" * 80)
    print("Testing GET /api/v1/admin/administrators endpoint")
    print("=" * 80)
    
    # First, let's try to get a test token by logging in
    # or we can use a raw request to see what the server says
    
    login_url = f"{BACKEND_URL}/api/v1/auth/login"
    test_email = os.getenv("TEST_EMAIL")
    test_password = os.getenv("TEST_PASSWORD")

    if not test_email or not test_password:
        print("ERROR: Set TEST_EMAIL and TEST_PASSWORD in the root .env file")
        return
    
    print(f"\nAttempting to login to {login_url}")
    try:
        login_response = requests.post(
            login_url,
            json={
                "email_or_instagram": test_email,
                "password": test_password
            },
            timeout=5
        )
        print(f"Login response status: {login_response.status_code}")
        
        if login_response.status_code == 200:
            login_data = login_response.json()
            token = login_data.get("access_token")
            print(f"Got token: {token[:20]}...")
            
            # Now try the admin endpoint with token
            admin_url = f"{BACKEND_URL}/api/v1/admin/administrators"
            print(f"\nFetching {admin_url}")
            
            headers = {
                "Authorization": f"Bearer {token}"
            }
            
            admin_response = requests.get(
                admin_url,
                headers=headers,
                timeout=5
            )
            
            print(f"Admin endpoint response status: {admin_response.status_code}")
            print(f"Admin endpoint response headers:")
            print(f"  Content-Type: {admin_response.headers.get('content-type')}")
            
            admin_data = admin_response.json()
            print(f"\nAdmin endpoint response JSON:")
            print(json.dumps(admin_data, indent=2))
            
            # Check specific field
            if "admins" in admin_data and len(admin_data["admins"]) > 0:
                first_admin = admin_data["admins"][0]
                print(f"\n[CHECK] First admin:")
                print(f"  Name: {first_admin.get('name')}")
                print(f"  Email: {first_admin.get('email')}")
                print(f"  experimentos_criados_total: {first_admin.get('experimentos_criados_total')}")
                print(f"  Type: {type(first_admin.get('experimentos_criados_total'))}")
                
                # Check if field exists
                if 'experimentos_criados_total' in first_admin:
                    print(f"  ✓ Field EXISTS in response")
                else:
                    print(f"  ✗ Field MISSING in response")
                    print(f"  Available fields: {list(first_admin.keys())}")
        else:
            print(f"Login failed: {login_response.text}")
            
    except requests.exceptions.ConnectionError:
        print(f"Cannot connect to {BACKEND_URL}")
        print("Make sure the backend is running")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_endpoint()
