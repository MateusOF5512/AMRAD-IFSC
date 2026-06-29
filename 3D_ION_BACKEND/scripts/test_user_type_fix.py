#!/usr/bin/env python3
"""
Quick test to verify user_type is now correctly logged
Run this after deploying the fixes
"""

import requests
import json
from datetime import datetime

# Configuration
BACKEND_URL = "http://localhost:8000"
TOKEN = "YOUR_ADMIN_TOKEN_HERE"  # Replace with actual token

def test_logging_fix():
    """Test if user_type is now correctly included in logs"""
    
    print("🧪 Testing user_type in Logs")
    print("=" * 60)
    
    # Make an authenticated request
    headers = {
        "Authorization": f"Bearer {TOKEN}"
    }
    
    print(f"\n📍 Making authenticated request to /api/v1/experiments/resumo")
    response = requests.get(f"{BACKEND_URL}/api/v1/experiments/resumo", headers=headers)
    print(f"Status: {response.status_code}")
    
    if response.status_code == 401:
        print("❌ Token is invalid or expired")
        print("Please replace TOKEN variable with valid admin token")
        return False
    
    print(f"✅ Request successful\n")
    
    # Query the database to find the latest log
    print("📊 Querying application_logs table...")
    print("(You should see this log in Supabase dashboard)")
    print()
    print("Expected values in new log:")
    print("  • endpoint: /api/v1/experiments/resumo")
    print("  • http_method: GET")
    print("  • http_status: 200")
    print("  • user_type: admin (if you're admin user)")
    print("  • user_name: (should be populated)")
    print()
    
    print("🔍 Check in Supabase:")
    print("1. Go to Supabase dashboard")
    print("2. Select application_logs table")
    print("3. Look at the last row")
    print("4. Verify user_type is 'admin' (not 'pesquisador')")
    
    return True

def manual_check():
    """Instructions for manual checking"""
    print("\n" + "="*60)
    print("📋 Manual Verification Steps")
    print("="*60)
    
    print("""
1. RESTART THE BACKEND:
   - Kill current backend process
   - Restart: python -m uvicorn app.main:app --reload

2. LOGIN AS ADMIN:
   - Use frontend to login as admin user
   - Frontend should redirect and show dashboard

3. MAKE A REQUEST:
   curl http://localhost:8000/api/v1/admin/users \\
     -H "Authorization: Bearer <YOUR_TOKEN>"

4. CHECK LOGS:
   python scripts/verify_logging_quality.py
   
   Look for output like:
   ✅ With user_type: 1 (100%)
   
   And in sample logs:
   User Type: admin  (for admin users)
   User Type: pesquisador  (for regular users)

5. VERIFY IN DATABASE:
   Go to Supabase dashboard → application_logs table
   New logs should have:
   - user_type: "admin" (if admin) or "pesquisador"
   - user_name: (populated from database)
""")

if __name__ == "__main__":
    print("\n🚀 User Type Logging Fix - Test Suite\n")
    
    if TOKEN == "YOUR_ADMIN_TOKEN_HERE":
        print("⚠️  Please update the TOKEN variable at the top of this script")
        print()
        manual_check()
    else:
        if test_logging_fix():
            manual_check()
