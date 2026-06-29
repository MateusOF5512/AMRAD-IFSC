#!/usr/bin/env python
"""
Test using FastAPI TestClient to bypass authentication issues
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

# Mock the authentication for testing
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app

def test_admin_endpoint_with_mock_auth():
    """Test the endpoint by mocking authentication"""
    print("=" * 80)
    print("Testing GET /admin/administrators with mocked auth")
    print("=" * 80)
    
    client = TestClient(app)
    
    # Mock the get_current_admin dependency
    def mock_get_current_admin():
        return {"id": "test-admin-id", "email": "test@example.com", "user_type": "admin"}
    
    # Test without authentication first to see the error
    response = client.get("/api/v1/admin/administrators")
    print(f"\n[TEST] Without auth:")
    print(f"  Status: {response.status_code}")
    print(f"  Body: {response.text[:200]}")
    
    # Now test with mocked auth
    from app.routers import admin
    
    with patch.object(admin, 'get_current_admin', return_value=mock_get_current_admin()):
        response = client.get(
            "/api/v1/admin/administrators",
            headers={"Authorization": "Bearer test_token"}
        )
        print(f"\n[TEST] With mocked auth:")
        print(f"  Status: {response.status_code}")
        if response.status_code == 200:
            import json
            data = response.json()
            print(f"\n[TEST] Response JSON:")
            print(json.dumps(data, indent=2))
            
            if "admins" in data and len(data["admins"]) > 0:
                first_admin = data["admins"][0]
                print(f"\n[TEST] First Admin:")
                print(f"  Fields present: {list(first_admin.keys())}")
                if 'experimentos_criados_total' in first_admin:
                    print(f"  ✓ experimentos_criados_total EXISTS: {first_admin.get('experimentos_criados_total')}")
                else:
                    print(f"  ✗ experimentos_criados_total MISSING")
        else:
            print(f"  Body: {response.text}")

if __name__ == "__main__":
    test_admin_endpoint_with_mock_auth()
