#!/usr/bin/env python3
"""
Verificar status e distribuição de samples
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.database.supabase import get_supabase_client

supabase = get_supabase_client()

print("=" * 100)
print("ANÁLISE: STATUS DOS RESEARCHERS E SAMPLES")
print("=" * 100)

# Get all samples and researchers
samples_response = supabase.table("samples").select("researcher_id").execute()
all_samples = samples_response.data

researchers_response = supabase.table("researchers").select("id, name, email, status, user_type").execute()
all_researchers = researchers_response.data

# Group samples by researcher
samples_by_researcher = {}
for sample in all_samples:
    r_id = sample.get('researcher_id')
    if r_id not in samples_by_researcher:
        samples_by_researcher[r_id] = 0
    samples_by_researcher[r_id] += 1

# Show researcher status and sample count
print("\nResearchers and their status:")
print("-" * 100)
print(f"{'Name':<30} | {'Status':<12} | {'User Type':<12} | {'Samples':<8} | {'Email'}")
print("-" * 100)

total_samples_shown = 0

for researcher in sorted(all_researchers, key=lambda x: samples_by_researcher.get(x['id'], 0), reverse=True):
    r_id = researcher['id']
    name = researcher.get('name', 'Unknown')[:28]
    status = researcher.get('status', 'unknown')
    user_type = researcher.get('user_type', 'unknown')
    email = researcher.get('email', 'unknown')
    samples_count = samples_by_researcher.get(r_id, 0)
    
    if samples_count > 0:
        total_samples_shown += samples_count
        print(f"{name:<30} | {status:<12} | {user_type:<12} | {samples_count:<8} | {email}")

print("-" * 100)
print(f"{'TOTAL (com samples)':<30} | {'':<12} | {'':<12} | {total_samples_shown:<8}")

# Summary by status
print("\n" + "=" * 100)
print("RESUMO POR STATUS")
print("=" * 100)

status_summary = {}
for status_val in ['regular', 'irregular', 'desativado']:
    users_with_this_status = [r for r in all_researchers if r.get('status') == status_val]
    samples_with_this_status = sum(
        samples_by_researcher.get(u['id'], 0) 
        for u in users_with_this_status
    )
    status_summary[status_val] = {
        'users': len(users_with_this_status),
        'samples': samples_with_this_status
    }

for status_val, data in status_summary.items():
    print(f"\nStatus: {status_val}")
    print(f"  - Usuários: {data['users']}")
    print(f"  - Samples: {data['samples']}")

total_in_summary = sum(d['samples'] for d in status_summary.values())
print(f"\nTotal de samples (soma de status): {total_in_summary}")
print(f"Total na tabela samples: {len(all_samples)}")
print(f"Bate? {'✅ SIM' if total_in_summary == len(all_samples) else '❌ NÃO'}")

if total_in_summary < len(all_samples):
    print(f"\n⚠️  Faltam {len(all_samples) - total_in_summary} samples!")
    print("Possível causa: Researchers sem status, ou status inválido")
    
    print("\nResearchers com samples mas SEM status válido:")
    for researcher in all_researchers:
        r_id = researcher['id']
        samples_count = samples_by_researcher.get(r_id, 0)
        if samples_count > 0 and researcher.get('status') not in ['regular', 'irregular', 'desativado']:
            print(f"  - {researcher.get('name')} (status: {researcher.get('status')}): {samples_count} samples")

print("\n" + "=" * 100)
