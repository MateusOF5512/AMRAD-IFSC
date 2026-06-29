#!/usr/bin/env python
"""Test the admin GET endpoint"""
import sys
sys.path.insert(0, '.')

from app.main import app
from fastapi.testclient import TestClient
from app.core.security import create_access_token

# Create test client
client = TestClient(app)

# Create a test admin token
test_admin_id = "26a6abc8-1d1b-4f6e-9c9a-8e3f8a6e9f7a"  # Real ID from database that's an admin
token = create_access_token(test_admin_id, {})

print("Testando endpoint GET /api/v1/admin/users\n")
print(f"Token gerado para: {test_admin_id}\n")

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
    print(f"✓ Users returned: {len(data.get('users', []))}\n")
    
    print("First 3 users with experiment count:")
    for user in data.get('users', [])[:3]:
        print(f"  - {user.get('name')}: {user.get('experimentos_criados_total')} samples")
else:
    print(f"✗ Error: {response.text}")
