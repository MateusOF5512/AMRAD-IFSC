#!/usr/bin/env python
"""Debug infill measurements"""
import os
from load_env import load_project_env

load_project_env()

from supabase import create_client
import json

supabase_url = os.getenv('SUPABASE_URL')
supabase_service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

print(f'[*] Checking environment...')
if not supabase_url or not supabase_service_key:
    print('ERROR: Missing SUPABASE credentials')
    exit(1)

print('[+] Creating Supabase client...')
supabase = create_client(supabase_url, supabase_service_key)

print('[+] Checking infill_measurements table...')
try:
    response = supabase.table('infill_measurements').select('id', count='exact').limit(1).execute()
    print(f'[✓] Table exists. Total records: {response.count}')
    
    if response.data:
        print(f'[✓] First record available')
except Exception as e:
    print(f'[✗] Error: {str(e)}')
    exit(1)

print('\n[+] Checking sample with infill data...')
try:
    # Get first sample
    samples = supabase.table('samples').select('id', count='exact').limit(1).execute()
    if samples.count > 0:
        sample_id = samples.data[0]['id']
        print(f'[*] Sample ID: {sample_id}')
        
        # Get infill for this sample
        infill = supabase.table('infill_measurements').select('hu_value').eq('sample_id', sample_id).execute()
        print(f'[✓] Infill records for sample: {len(infill.data)}')
        
        if len(infill.data) > 0:
            hu_values = [m.get('hu_value') for m in infill.data if m.get('hu_value') is not None]
            if hu_values:
                mean = sum(hu_values) / len(hu_values)
                print(f'[✓] HU Mean: {mean}')
            else:
                print('[!] No valid HU values found')
        else:
            print('[!] No infill data for this sample')
    else:
        print('[!] No samples in database')
except Exception as e:
    print(f'[✗] Error: {str(e)}')
    exit(1)
