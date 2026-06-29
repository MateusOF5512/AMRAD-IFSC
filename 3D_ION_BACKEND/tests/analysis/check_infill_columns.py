#!/usr/bin/env python
"""Check infill_measurements column names"""
import os
from load_env import load_project_env

load_project_env()

from supabase import create_client
import json

supabase_url = os.getenv('SUPABASE_URL')
supabase_service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase = create_client(supabase_url, supabase_service_key)

print('[+] Getting first infill_measurements record...')
try:
    response = supabase.table('infill_measurements').select('*').limit(1).execute()
    if response.data:
        record = response.data[0]
        print('[✓] Columns in infill_measurements:')
        for key in record.keys():
            print(f'  - {key}: {type(record[key]).__name__}')
        
        print(f'\n[✓] Full record:')
        print(json.dumps(record, indent=2))
    else:
        print('[!] No records found')
except Exception as e:
    print(f'[✗] Error: {str(e)}')
    exit(1)
