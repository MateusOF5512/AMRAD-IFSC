"""
Create test account in Supabase using Admin API
Uses SERVICE_ROLE_KEY to bypass email rate limits
"""

import os
from load_env import load_project_env
from supabase import create_client

load_project_env()

supabase_url = os.getenv("SUPABASE_URL")
supabase_service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
test_email = os.getenv("TEST_EMAIL")
test_password = os.getenv("TEST_PASSWORD")

print(f"\nCreating test account in Supabase (Admin API):")
print(f"  Email: {test_email}")
print(f"  Supabase URL: {supabase_url}")

# Use Service Role client (admin access - bypasses rate limits)
supabase = create_client(supabase_url, supabase_service_role_key)

try:
    # Create user with admin API (bypasses email verification and rate limits)
    response = supabase.auth.admin.create_user({
        "email": test_email,
        "password": test_password,
        "email_confirm": True  # Mark as verified immediately
    })
    
    print(f"\n[SUCCESS] Test account created via Admin API!")
    print(f"  User ID: {response.user.id}")
    print(f"  Email: {response.user.email}")
    print(f"  Email Confirmed: {response.user.email_confirmed_at is not None}")
    
except Exception as e:
    error_msg = str(e).lower()
    
    if "already exists" in error_msg or "duplicate" in error_msg:
        print(f"\n[INFO] Account already exists (expected)")
        print(f"  This is fine - account will be reused for testing")
    else:
        print(f"\n[FAIL] Error: {str(e)}")

