#!/usr/bin/env python
"""Simular exatamente o que o frontend faz"""
import sys
sys.path.insert(0, '.')

import json
from app.database.supabase import get_supabase_client
from app.main import app
from fastapi.testclient import TestClient
from app.core.security import create_access_token

print("=" * 80)
print("SIMULAÇÃO COMPLETA - Frontend → Backend → Frontend")
print("=" * 80)

supabase = get_supabase_client()

# 1. Get admin token
admin_response = supabase.table("researchers").select("id").eq("user_type", "admin").limit(1).execute()
admin_id = admin_response.data[0].get("id")
token = create_access_token(admin_id, {})

# 2. Create test client (simula frontend)
client = TestClient(app)

# 3. Fazer requisição para cada status
for status in ["regular", "irregular", "desativado"]:
    print(f"\n{'='*80}")
    print(f"STATUS: {status}")
    print(f"{'='*80}")
    
    response = client.get(
        f"/api/v1/admin/users?status={status}&page=1&per_page=100",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    print(f"HTTP Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        
        print(f"Total users: {data.get('total')}")
        print(f"Returned users: {len(data.get('users', []))}")
        
        if data.get('users'):
            print(f"\nExaminando primeiro usuário:")
            user = data['users'][0]
            
            print(f"  id: {user.get('id')}")
            print(f"  name: {user.get('name')}")
            print(f"  email: {user.get('email')}")
            print(f"  status: {user.get('status')}")
            print(f"  experimentos_criados_total: {user.get('experimentos_criados_total')} ← CAMPO CRÍTICO")
            
            # Verificar tipo de dado
            exp_total = user.get('experimentos_criados_total')
            print(f"\n  Tipo de dato: {type(exp_total).__name__}")
            print(f"  Valor é numérico? {isinstance(exp_total, (int, float))}")
            print(f"  Valor é zero? {exp_total == 0}")
            print(f"  Valor é None? {exp_total is None}")
            
            # Exibir resposta JSON completa do primeiro usuário
            print(f"\n  JSON Completo do primeiro usuário:")
            print(f"  {json.dumps(user, indent=4)}")
            
            # Verificar todos os usuários
            print(f"\n  Resumo de todos os usuários:")
            print(f"  {'Nome':<25} | {'Experimentos':<12} | {'Status'}")
            print(f"  {'-'*60}")
            for u in data.get('users', [])[:10]:
                exp = u.get('experimentos_criados_total', 'NULL')
                print(f"  {u.get('name', 'N/A'):<25} | {str(exp):<12} | {u.get('status', 'N/A')}")
    else:
        print(f"ERROR: {response.text}")

print(f"\n{'='*80}")
print("FIM DO TESTE")
print(f"{'='*80}")
