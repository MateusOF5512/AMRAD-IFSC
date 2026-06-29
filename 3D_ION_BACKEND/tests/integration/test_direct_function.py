#!/usr/bin/env python
"""
Direct function test - call get_administrators() function directly
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import asyncio
import json
from app.routers.admin import get_administrators
from app.database.supabase import get_supabase_client

async def test_function_directly():
    """Call the function directly to test"""
    print("=" * 80)
    print("Testing get_administrators() function directly")
    print("=" * 80)
    
    # Mock the admin_user parameter
    mock_admin_user = {"id": "test-admin", "email": "test@example.com", "user_type": "admin"}
    
    try:
        # Call the async function
        result = await get_administrators(admin_user=mock_admin_user)
        
        print(f"\n[TEST] Function returned:")
        print(f"  Type: {type(result)}")
        print(f"  {result}")
        
        # Convert to dict for JSON serialization
        result_dict = result.model_dump()
        
        print(f"\n[TEST] As dict:")
        print(json.dumps(result_dict, indent=2))
        
        if "admins" in result_dict and len(result_dict["admins"]) > 0:
            first_admin = result_dict["admins"][0]
            print(f"\n[TEST] First admin:")
            print(f"  Keys: {list(first_admin.keys())}")
            print(f"  Name: {first_admin.get('name')}")
            print(f"  experimentos_criados_total: {first_admin.get('experimentos_criados_total')}")
            
            if 'experimentos_criados_total' in first_admin:
                print(f"  ✓ Field EXISTS")
            else:
                print(f"  ✗ Field MISSING")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_function_directly())
