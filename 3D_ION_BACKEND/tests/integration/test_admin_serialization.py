#!/usr/bin/env python
"""
Test script to verify JSON serialization of AdminInfo
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.routers.admin import AdminInfo, AdminListResponse
from pydantic import BaseModel
import json

def test_admin_info_serialization():
    """Test AdminInfo serialization"""
    print("=" * 80)
    print("Testing AdminInfo JSON Serialization")
    print("=" * 80)
    
    # Create test AdminInfo
    admin_info = AdminInfo(
        id="test-id-123",
        name="Test Admin",
        email="test@example.com",
        user_type="admin",
        institution="Test Institution",
        experimentos_criados_total=42,
        created_at="2026-02-19T10:00:00"
    )
    
    print(f"\n[TEST] AdminInfo object created:")
    print(f"  {admin_info}")
    print(f"\n[TEST] AdminInfo as dict:")
    admin_dict = admin_info.model_dump()
    print(f"  {json.dumps(admin_dict, indent=2)}")
    
    print(f"\n[TEST] AdminInfo as JSON:")
    admin_json = admin_info.model_dump_json()
    print(f"  {admin_json}")
    
    # Create AdminListResponse
    response = AdminListResponse(
        admins=[admin_info],
        total=1
    )
    
    print(f"\n[TEST] AdminListResponse object created:")
    print(f"  {response}")
    print(f"\n[TEST] AdminListResponse as dict:")
    response_dict = response.model_dump()
    print(f"  {json.dumps(response_dict, indent=2)}")
    
    print(f"\n[TEST] AdminListResponse as JSON:")
    response_json = response.model_dump_json()
    print(f"  {response_json}")
    
    # Check if experimentos_criados_total is in the JSON
    parsed = json.loads(response_json)
    if parsed['admins'] and len(parsed['admins']) > 0:
        first_admin = parsed['admins'][0]
        print(f"\n[TEST] First admin in response:")
        print(f"  Full object: {json.dumps(first_admin, indent=2)}")
        print(f"  experimentos_criados_total: {first_admin.get('experimentos_criados_total')}")
        print(f"  Type: {type(first_admin.get('experimentos_criados_total'))}")

if __name__ == "__main__":
    test_admin_info_serialization()
