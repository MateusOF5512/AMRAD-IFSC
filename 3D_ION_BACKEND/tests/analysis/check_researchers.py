#!/usr/bin/env python
"""Check researcher status distribution"""
import sys
sys.path.insert(0, '.')

from app.database.supabase import get_supabase_client

supabase = get_supabase_client()

# Get all researchers
print('Verificando status dos researchers...\n')
all_researchers = supabase.table('researchers').select('id, name, email, status, user_type').execute()
print(f'Total de researchers: {len(all_researchers.data)}\n')

# Count by status
status_counts = {}
for r in all_researchers.data:
    status = r.get('status', 'NULL')
    status_counts[status] = status_counts.get(status, 0) + 1

print('Distribuição de status:')
for status, count in sorted(status_counts.items()):
    print(f'  {status}: {count}')

print('\nPrimeiros 5 researchers:')
for r in all_researchers.data[:5]:
    print(f'  - {r.get("name")} ({r.get("email")})')
    print(f'    status={r.get("status")}, user_type={r.get("user_type")}')
