#!/usr/bin/env python
"""Check which tables exist in Supabase"""
import sys
sys.path.insert(0, '.')

from app.database.supabase import get_supabase_client

supabase = get_supabase_client()

# Test known tables
known_tables = ['researchers', 'experiments', 'materials', 'machines', 'samples', 'draft_experiments', 'user_status_logs']

print("Verificando tabelas na database:\n")

for table_name in known_tables:
    try:
        resp = supabase.table(table_name).select('id', count='exact').limit(1).execute()
        print(f"✓ {table_name:25} EXISTS")
    except Exception as e:
        error_msg = str(e)
        if 'Could not find the table' in error_msg:
            print(f"✗ {table_name:25} NOT FOUND")
        else:
            print(f"? {table_name:25} ERROR: {type(e).__name__}")

print("\nVerificar qual tabela tem user_id...")

# Tenta descobrir qual tabela tem user_id
for table_name in ['experiments', 'draft_experiments', 'samples', 'materials']:
    try:
        resp = supabase.table(table_name).select('user_id', count='exact').limit(1).execute()
        print(f"✓ {table_name} has user_id column")
    except Exception as e:
        if 'Could not find the column' in str(e) or 'column' in str(e).lower():
            print(f"✗ {table_name} - sem coluna user_id")
        elif 'Could not find the table' not in str(e):
            print(f"  {table_name} - {type(e).__name__}")
