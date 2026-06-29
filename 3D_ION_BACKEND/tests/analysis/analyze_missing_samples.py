#!/usr/bin/env python3
"""
Investigar discrepância entr total de samples e soma por usuário
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from app.database.supabase import get_supabase_client

supabase = get_supabase_client()

print("=" * 100)
print("INVESTIGAÇÃO: DISCREPÂNCIA DE EXPERIMENTOS")
print("=" * 100)

# 1. Total de samples na tabela
print("\n[1] Total de samples na tabela 'samples':")
print("-" * 100)
try:
    response = supabase.table("samples").select("id", count="exact").execute()
    total_samples = response.count
    print(f"Total: {total_samples}")
except Exception as e:
    print(f"ERROR: {e}")
    total_samples = 0

# 2. Samples com researcher_id válido
print("\n[2] Samples com researcher_id (não NULL):")
print("-" * 100)
try:
    response = supabase.table("samples").select("*").not_("researcher_id", "is", "null").execute()
    valid_samples = response.data
    print(f"Total com researcher_id válido: {len(valid_samples)}")
except Exception as e:
    print(f"ERROR: {e}")
    valid_samples = []

# 3. Samples com researcher_id NULL
print("\n[3] Samples com researcher_id NULL:")
print("-" * 100)
try:
    response = supabase.table("samples").select("*").is_("researcher_id", "null").execute()
    null_samples = response.data
    print(f"Total com researcher_id NULL: {len(null_samples)}")
    if null_samples:
        print(f"IDs dos samples sem researcher_id: {[s.get('id', 'unknown')[:8] for s in null_samples[:5]]}...")
except Exception as e:
    print(f"ERROR: {e}")
    null_samples = []

# 4. Samples com researcher_id que NÃO EXISTE em researchers
print("\n[4] Samples com researcher_id inválido (não existe em researchers):")
print("-" * 100)
try:
    # Pegar all researchers
    researchers_response = supabase.table("researchers").select("id").execute()
    valid_researcher_ids = set(r['id'] for r in researchers_response.data)
    
    # Pegar todos os samples
    samples_response = supabase.table("samples").select("researcher_id").execute()
    
    invalid_count = 0
    invalid_ids = []
    
    for sample in samples_response.data:
        researcher_id = sample.get('researcher_id')
        if researcher_id and researcher_id not in valid_researcher_ids:
            invalid_count += 1
            if len(invalid_ids) < 5:
                invalid_ids.append(researcher_id)
    
    print(f"Samples com researcher_id inválido: {invalid_count}")
    if invalid_ids:
        print(f"Examples: {invalid_ids}")
        
except Exception as e:
    print(f"ERROR: {e}")
    invalid_count = 0

# 5. Soma correta: Contar samples válidos por researcher
print("\n[5] Soma correta de samples por researcher:")
print("-" * 100)
try:
    # Get all researchers
    researchers = supabase.table("researchers").select("id, name, email").execute().data
    
    total_by_researchers = 0
    researchers_with_samples = {}
    
    for researcher in researchers:
        r_id = researcher['id']
        r_name = researcher['name']
        r_email = researcher['email']
        
        # Count samples for this researcher
        samples_response = supabase.table("samples").select("id", count="exact").eq("researcher_id", r_id).execute()
        count = samples_response.count if samples_response.count else 0
        
        total_by_researchers += count
        if count > 0:
            researchers_with_samples[r_name] = count
    
    print(f"Soma total de samples por researcher: {total_by_researchers}")
    
    print(f"\nDetalhes:")
    for name, count in sorted(researchers_with_samples.items(), key=lambda x: x[1], reverse=True):
        print(f"  - {name}: {count}")
    
except Exception as e:
    print(f"ERROR: {e}")
    total_by_researchers = 0

# 6. Análise e conclusão
print("\n" + "=" * 100)
print("ANÁLISE")
print("=" * 100)

missing_samples = total_samples - total_by_researchers

print(f"\nTotal de samples na tabela: {total_samples}")
print(f"Soma por researcher: {total_by_researchers}")
print(f"Diferença: {missing_samples}")

if missing_samples > 0:
    print(f"\n🔍 {missing_samples} samples estão perdidos!")
    print(f"\nPossíveis causas:")
    print(f"  1. {len(null_samples)} samples têm researcher_id = NULL")
    print(f"  2. {invalid_count} samples apontam para researcher_id inválido")
    
    print(f"\nTotal explicado: {len(null_samples) + invalid_count}")
    
    if (len(null_samples) + invalid_count) == missing_samples:
        print(f"✅ Explicação completa: Todos os {missing_samples} samples sem researcher_id foram encontrados!")
    else:
        unexplained = missing_samples - (len(null_samples) + invalid_count)
        print(f"⚠️  Ainda faltam explicar: {unexplained} samples")
elif missing_samples == 0:
    print(f"\n✅ Tudo bate! Todos os {total_samples} samples estão associados a um researcher.")

print("\n" + "=" * 100)
