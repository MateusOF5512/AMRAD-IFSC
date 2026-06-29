#!/usr/bin/env python
"""
Debug detalhado - rastrear exatamente o que é retornado para cada email
Simular o mesmo fluxo que o frontend faz
"""
import sys
sys.path.insert(0, '.')

import json
from app.database.supabase import get_supabase_client
from app.main import app
from fastapi.testclient import TestClient
from app.core.security import create_access_token

supabase = get_supabase_client()

# Get admin token
admin_response = supabase.table("researchers").select("id").eq("user_type", "admin").limit(1).execute()
admin_id = admin_response.data[0].get("id")
token = create_access_token(admin_id, {})

client = TestClient(app)

print("=" * 100)
print("DEBUG DETALHADO - Verificar contagem de experimentos por email")
print("=" * 100)

# Verificar emails específicos que o usuário vê
test_emails = [
    "mateus1@gmail.com",  # MATEUS ORTIZ ADMIN
    "mateus7ortiz@gmail.com",  # MATEUS ORTIZ FERREIRA (com 33 samples)
    "test_1771341284761@example.com",  # Um dos Test User Complete
]

print("\n1. VERIFICAR DADOS DIRETOS DO BANCO:\n")

for email in test_emails:
    # Get researcher
    resp = supabase.table("researchers").select("*").eq("email", email).execute()
    if resp.data:
        researcher = resp.data[0]
        rid = researcher.get("id")
        
        # Count samples
        samples_resp = supabase.table("samples").select("id", count="exact").eq("researcher_id", rid).execute()
        sample_count = samples_resp.count
        
        print(f"Email: {email}")
        print(f"  Name: {researcher.get('name')}")
        print(f"  Status: {researcher.get('status')}")
        print(f"  ID: {rid}")
        print(f"  Samples no banco: {sample_count}")
        print()

print("\n" + "=" * 100)
print("2. VERIFICAR RESPOSTA DO ENDPOINT /admin/users:\n")

for status in ["regular", "irregular", "desativado"]:
    response = client.get(
        f"/api/v1/admin/users?status={status}&page=1&per_page=100",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response.status_code == 200:
        data = response.json()
        
        print(f"\nStatus: {status}")
        print(f"Total users returned: {len(data['users'])}")
        
        # Procurar pelos emails específicos
        for user in data['users']:
            if user['email'] in test_emails:
                print(f"\n  ENCONTRADO: {user['email']}")
                print(f"    Name: {user['name']}")
                print(f"    Status: {user['status']}")
                print(f"    ID: {user['id']}")
                print(f"    experimentos_criados_total: {user.get('experimentos_criados_total')} ← CRÍTICO")
                print(f"    JSON completo: {json.dumps(user, indent=6)}")

print("\n" + "=" * 100)
print("3. COMPARAR BANCO vs ENDPOINT:\n")

# Fazer um mapa de banco
banco_map = {}
for email in test_emails:
    resp = supabase.table("researchers").select("id, name, status, email").eq("email", email).execute()
    if resp.data:
        researcher = resp.data[0]
        rid = researcher.get("id")
        samples_resp = supabase.table("samples").select("id", count="exact").eq("researcher_id", rid).execute()
        banco_map[email] = {
            "name": researcher.get("name"),
            "status": researcher.get("status"),
            "id": rid,
            "samples_banco": samples_resp.count
        }

# Fazer mapa da API
api_map = {}
for status in ["regular", "irregular", "desativado"]:
    response = client.get(
        f"/api/v1/admin/users?status={status}&page=1&per_page=100",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response.status_code == 200:
        data = response.json()
        for user in data['users']:
            if user['email'] in test_emails:
                api_map[user['email']] = {
                    "name": user['name'],
                    "status": user['status'],
                    "id": user['id'],
                    "samples_api": user.get('experimentos_criados_total')
                }

# Comparar
print("Email | Banco Samples | API Samples | Match?")
print("-" * 70)
for email in test_emails:
    banco_samples = banco_map.get(email, {}).get("samples_banco", "NOT FOUND")
    api_samples = api_map.get(email, {}).get("samples_api", "NOT FOUND")
    match = "✓" if banco_samples == api_samples else "✗ MISMATCH"
    
    print(f"{email:<35} | {str(banco_samples):<13} | {str(api_samples):<11} | {match}")

print("\n" + "=" * 100)
