#!/usr/bin/env python
"""Find an admin user to use for testing"""
import os
from load_env import load_project_env

load_project_env()

from supabase import create_client

supabase_url = os.getenv('SUPABASE_URL')
supabase_service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase = create_client(supabase_url, supabase_service_key)

# Find an admin user
print('[+] Looking for admin users...')
try:
    response = supabase.table('researchers').select('id, email, user_type').eq('user_type', 'admin').limit(1).execute()
    
    if response.data:
        admin = response.data[0]
        print(f'[✓] Found admin user:')
        print(f'  - ID: {admin["id"]}')
        print(f'  - Email: {admin["email"]}')
        print(f'  - Type: {admin["user_type"]}')
    else:
        print('[!] No admin users found')
except Exception as e:
    print(f'[✗] Error: {str(e)}')
