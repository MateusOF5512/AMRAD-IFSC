#!/usr/bin/env python3
"""
Debug detalhado: Contar samples corretamente
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.database.supabase import get_supabase_client

supabase = get_supabase_client()

print("=" * 100)
print("DEBUG DETALHADO: CONTAGEM DE SAMPLES")
print("=" * 100)

# Pegar TODOS os samples
print("\n[STEP 1] Fetching ALL samples from database:")
print("-" * 100)
try:
    response = supabase.table("samples").select("*").execute()
    all_samples = response.data
    print(f"Total samples fetched: {len(all_samples)}")
    
    # Group by researcher_id
    by_researcher = {}
    for sample in all_samples:
        r_id = sample.get('researcher_id', 'NO_ID')
        if r_id not in by_researcher:
            by_researcher[r_id] = []
        by_researcher[r_id].append(sample)
    
    print(f"Unique researcher_ids: {len(by_researcher)}")
    
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Get researcher names
print("\n[STEP 2] Getting researcher details:")
print("-" * 100)
try:
    researchers = supabase.table("researchers").select("id, name, email").execute().data
    researcher_map = {r['id']: r for r in researchers}
    print(f"Total researchers in database: {len(researchers)}")
except Exception as e:
    print(f"ERROR: {e}")
    researcher_map = {}

# Show results
print("\n[STEP 3] Samples grouped by researcher:")
print("-" * 100)
grand_total = 0
for r_id, samples in sorted(by_researcher.items(), key=lambda x: -len(x[1])):
    count = len(samples)
    grand_total += count
    
    if r_id in researcher_map:
        name = researcher_map[r_id].get('name', 'Unknown')
        email = researcher_map[r_id].get('email', 'Unknown')
        print(f"{count:3} samples | {name:30} | {email}")
    else:
        print(f"{count:3} samples | [UNKNOWN RESEARCHER] | {r_id}")

print(f"\n{'Total':>40}: {grand_total}")

print("\n" + "=" * 100)
print("CONCLUSÃO")
print("=" * 100)
print(f"""
Total de samples na tabela: {len(all_samples)}
Soma por researcher: {grand_total}
Bate? {'✅ SIM' if len(all_samples) == grand_total else '❌ NÃO'}

Se o total no frontend diz 76, mas a soma por researcher é menor,
isso significa que há researchers SEM samples que não aparecem na lista.
""")
