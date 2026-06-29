#!/usr/bin/env python
"""Test the admin GET endpoint with real data"""
import sys
sys.path.insert(0, '.')

from app.database.supabase import get_supabase_client
from app.main import app
from fastapi.testclient import TestClient
from app.core.security import create_access_token

supabase = get_supabase_client()

# Find a real admin in the database
print("Procurando admin na database...\n")
admin_response = supabase.table("researchers").select("id, name, user_type").eq("user_type", "admin").limit(1).execute()

if not admin_response.data:
    print("✗ Nenhum admin encontrado no banco!")
    sys.exit(1)

admin = admin_response.data[0]
admin_id = admin.get("id")
print(f"✓ Admin encontrado: {admin.get('name')} ({admin_id})\n")

# Create test client
client = TestClient(app)

# Create a test token for this admin
token = create_access_token(admin_id, {})

print("Testando endpoint GET /api/v1/admin/users\n")

# Test GET /api/v1/admin/users
response = client.get(
    "/api/v1/admin/users?status=irregular&page=1&per_page=10",
    headers={"Authorization": f"Bearer {token}"}
)

print(f"Status Code: {response.status_code}\n")

if response.status_code == 200:
    data = response.json()
    print(f"✓ Total users: {data.get('total')}")
    print(f"✓ Page: {data.get('page')}")
    print(f"✓ Per page: {data.get('per_page')}")
    print(f"✓ Users returned: {len(data.get('users', []))}\n")
    
    print("Primeiros 5 users com contagem de samples:")
    for user in data.get('users', [])[:5]:
        print(f"  - {user.get('name')}: {user.get('experimentos_criados_total')} samples")
else:
    print(f"✗ Error: {response.text}")
