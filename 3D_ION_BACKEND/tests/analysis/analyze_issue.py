#!/usr/bin/env python
"""
Análise profunda - Simular EXATAMENTE o que o frontend faz
Verificar se há diferença entre o que backend retorna e o que frontend exibe
"""
import sys
sys.path.insert(0, '.')

import json
from app.database.supabase import get_supabase_client
from app.main import app
from fastapi.testclient import TestClient
from app.core.security import create_access_token

supabase = get_supabase_client()

print("=" * 100)
print("ANÁLISE COMPLETA - Por que Experimentos está zerado?")
print("=" * 100)

# 1. Verificar samples no banco
print("\n1. SAMPLES NA DATABASE:\n")
samples_data = supabase.table("samples").select("researcher_id, id").execute()
sample_count_by_researcher = {}
for sample in samples_data.data:
    rid = sample.get("researcher_id")
    if rid not in sample_count_by_researcher:
        sample_count_by_researcher[rid] = 0
    sample_count_by_researcher[rid] += 1

print(f"   Total de samples: {len(samples_data.data)}")
print(f"   Researchers com samples: {len(sample_count_by_researcher)}")
print(f"   Distribuição:")
for rid, count in sorted(sample_count_by_researcher.items(), key=lambda x: x[1], reverse=True):
    print(f"     {rid}: {count} samples")

# 2. Chamar API como o frontend faz
print("\n" + "=" * 100)
print("2. CHAMAR API (como frontend faz):\n")

admin_response = supabase.table("researchers").select("id").eq("user_type", "admin").limit(1).execute()
admin_id = admin_response.data[0].get("id")
token = create_access_token(admin_id, {})

client = TestClient(app)

for status in ["regular", "irregular", "desativado"]:
    response = client.get(
        f"/api/v1/admin/users?status={status}&page=1&per_page=100",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response.status_code == 200:
        data = response.json()
        users = data.get('users', [])
        
        print(f"\nStatus: {status}")
        print(f"   Total users na API: {len(users)}")
        
        if users:
            print(f"\n   Primeiros 5 usuários com contagem:")
            print(f"   {'Nome':<30} | {'Experimentos':<12} | {'ID':<36} | Samples no Banco")
            print(f"   {'-'*120}")
            
            for user in users[:5]:
                user_id = user.get("id")
                exp_count = user.get("experimentos_criados_total", 0)
                banco_count = sample_count_by_researcher.get(user_id, 0)
                match = "✓" if exp_count == banco_count else "✗ MISMATCH"
                
                print(f"   {user.get('name', 'N/A'):<30} | {exp_count:<12} | {user_id} | {banco_count} {match}")

# 3. Análise específica do MATEUS ORTIZ ADMIN
print("\n" + "=" * 100)
print("3. ANÁLISE ESPECÍFICA - MATEUS ORTIZ ADMIN:\n")

mateus_response = supabase.table("researchers").select("id, name, email, status").eq("email", "mateus1@gmail.com").execute()
if mateus_response.data:
    mateus = mateus_response.data[0]
    mateus_id = mateus.get("id")
    
    print(f"   Nome: {mateus.get('name')}")
    print(f"   Email: {mateus.get('email')}")
    print(f"   Status: {mateus.get('status')}")
    print(f"   ID: {mateus_id}")
    
    # Verificar samples diretos
    samples_response = supabase.table("samples").select("id").eq("researcher_id", mateus_id).execute()
    print(f"\n   Samples no banco com researcher_id={mateus_id}: {samples_response.count}")
    
    # Chamar API
    api_response = client.get(
        f"/api/v1/admin/users?status={mateus.get('status')}&page=1&per_page=100",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if api_response.status_code == 200:
        api_data = api_response.json()
        # Procurar por mateus1@gmail.com
        user = None
        for u in api_data.get('users', []):
            if u.get('email') == 'mateus1@gmail.com':
                user = u
                break
        
        if user:
            print(f"\n   [API RESPONSE]")
            print(f"   experimentos_criados_total: {user.get('experimentos_criados_total')}")
            print(f"   ID na resposta: {user.get('id')}")
            print(f"\n   [COMPARAÇÃO]")
            print(f"   Banco: {samples_response.count}")
            print(f"   API: {user.get('experimentos_criados_total')}")
            print(f"   Match: {'✓ SIM' if samples_response.count == user.get('experimentos_criados_total') else '✗ NÃO'}")
            
            # Se não match, investigar
            if samples_response.count != user.get('experimentos_criados_total'):
                print(f"\n   [INVESTIGAÇÃO] Por que não match?")
                print(f"   API ID: {user.get('id')}")
                print(f"   Banco ID: {mateus_id}")
                print(f"   IDs são iguais? {user.get('id') == mateus_id}")
        else:
            print("   [ERRO] Usuário não encontrado na resposta da API!")

# 4. Verificar a query SQL exata que o backend está fazendo
print("\n" + "=" * 100)
print("4. TESTE DE CONTAGEM DIRETA - Simular query do backend:\n")

test_user_id = list(sample_count_by_researcher.keys())[0] if sample_count_by_researcher else None
if test_user_id:
    print(f"   Usando user_id: {test_user_id}")
    
    # Teste direto
    direct_count = supabase.table("samples").select("id", count="exact").eq("researcher_id", test_user_id).execute()
    print(f"   Contagem direta (select count): {direct_count.count}")
    
    # Teste com len
    all_samples = supabase.table("samples").select("id").eq("researcher_id", test_user_id).execute()
    print(f"   Contagem com len: {len(all_samples.data)}")
    print(f"   Ambas iguais? {direct_count.count == len(all_samples.data)}")

print("\n" + "=" * 100)
print("FIM DA ANÁLISE")
print("=" * 100)
