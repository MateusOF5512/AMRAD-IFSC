#!/usr/bin/env python
"""Detailed test of admin endpoint with sample counts"""
import sys
sys.path.insert(0, '.')

from app.database.supabase import get_supabase_client
from app.main import app
from fastapi.testclient import TestClient
from app.core.security import create_access_token
import json

supabase = get_supabase_client()

# Find a real admin in the database
admin_response = supabase.table("researchers").select("id, name, user_type").eq("user_type", "admin").limit(1).execute()
admin = admin_response.data[0]
admin_id = admin.get("id")

print("=" * 80)
print("TESTE DETALHADO - Contagem de Samples por Researcher")
print("=" * 80)

# First, check samples directly from database
print("\n1. CHECANDO SAMPLES DIRETAMENTE NO BANCO:\n")

samples_response = supabase.table("samples").select("researcher_id, id").execute()
print(f"   Total de samples: {len(samples_response.data)}")

# Count by researcher_id
researcher_samples = {}
for sample in samples_response.data:
    rid = sample.get("researcher_id")
    if rid:
        if rid not in researcher_samples:
            researcher_samples[rid] = []
        researcher_samples[rid].append(sample.get("id"))

print(f"\n   Samples por researcher_id:")
for rid, samples_list in sorted(researcher_samples.items(), key=lambda x: len(x[1]), reverse=True):
    # Get researcher name
    r_resp = supabase.table("researchers").select("name").eq("id", rid).execute()
    r_name = r_resp.data[0].get("name") if r_resp.data else "UNKNOWN"
    print(f"     {rid}: {len(samples_list)} samples (researcher: {r_name})")

# Now test the endpoint
print("\n" + "=" * 80)
print("2. TESTANDO ENDPOINT /api/v1/admin/users:\n")

client = TestClient(app)
token = create_access_token(admin_id, {})

response = client.get(
    "/api/v1/admin/users?status=irregular&page=1&per_page=100",
    headers={"Authorization": f"Bearer {token}"}
)

if response.status_code == 200:
    data = response.json()
    users = data.get('users', [])
    
    print(f"   Status: {response.status_code} ✓")
    print(f"   Total users retornados: {len(users)}\n")
    
    print("   USER | samples (banco) | samples (endpoint) | MATCH")
    print("   " + "-" * 70)
    
    for user in users[:10]:
        user_id = user.get("id")
        endpoint_count = user.get("experimentos_criados_total", 0)
        db_count = len(researcher_samples.get(user_id, []))
        match = "✓" if endpoint_count == db_count else "✗ ERRO"
        
        print(f"   {user.get('name')[:20]:20} | {db_count:3} | {endpoint_count:3} | {match}")
    
    # Check for mismatches
    mismatches = []
    for user in users:
        user_id = user.get("id")
        endpoint_count = user.get("experimentos_criados_total", 0)
        db_count = len(researcher_samples.get(user_id, []))
        if endpoint_count != db_count:
            mismatches.append((user.get("name"), db_count, endpoint_count, user_id))
    
    if mismatches:
        print("\n   MISMATCHES ENCONTRADOS:")
        for name, db_count, ep_count, uid in mismatches:
            print(f"     {name}: DB={db_count}, Endpoint={ep_count} (id={uid})")
    else:
        print("\n   ✓ Todas as contagens estão corretas!")
else:
    print(f"   ✗ Erro: {response.status_code}")
    print(f"   Response: {response.text}")
