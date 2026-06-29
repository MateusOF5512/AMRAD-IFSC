#!/usr/bin/env python
"""Debug script to check users by status"""
import os
from load_env import load_project_env

load_project_env()

from supabase import create_client

supabase_url = os.getenv('SUPABASE_URL')
supabase_service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase = create_client(supabase_url, supabase_service_key)

statuses = ['regular', 'irregular', 'desativado']

for status in statuses:
    print(f'\n[+] Checking status: {status}')
    try:
        response = supabase.table('researchers').select('id, email, status', count='exact').eq('status', status).limit(5).execute()
        print(f'[✓] Status: {status}')
        print(f'  - Count: {response.count}')
        if response.data:
            print(f'  - First user: {response.data[0].get("email")}')
    except Exception as e:
        print(f'[✗] Error: {str(e)}')
        import traceback
        traceback.print_exc()
