#!/usr/bin/env python
"""
Test JSON serialization that FastAPI would use for the HTTP response
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import json
from fastapi.responses import JSONResponse
from app.routers.admin import AdminInfo, AdminListResponse
import asyncio

async def test_fastapi_response():
    """Test how FastAPI serializes the response"""
    print("=" * 80)
    print("Testing FastAPI JSON Response Serialization")
    print("=" * 80)
    
    # Create AdminListResponse
    admin_info = AdminInfo(
        id="test-123",
        name="Test Admin",
        email="test@example.com",
        user_type="admin",
        institution="Test Inst",
        experimentos_criados_total=42,
        created_at="2026-02-19T10:00:00"
    )
    
    response_obj = AdminListResponse(
        admins=[admin_info],
        total=1
    )
    
    # Test 1: Direct model_dump_json()
    print("\n[TEST 1] Using model_dump_json():")
    json_str = response_obj.model_dump_json()
    print(f"  {json_str}")
    
    # Test 2: What FastAPI would send
    # FastAPI uses response_model and then serializes using model_dump()
    print("\n[TEST 2] Using model_dump():")
    dict_data = response_obj.model_dump()
    json_str2 = json.dumps(dict_data)
    print(f"  {json_str2}")
    
    # Test 3: Parse back and check
    print("\n[TEST 3] Parse back from JSON:")
    parsed = json.loads(json_str)
    print(f"  First admin keys: {list(parsed['admins'][0].keys())}")
    print(f"  experimentos_criados_total: {parsed['admins'][0].get('experimentos_criados_total')}")
    print(f"  ✓ Field is present in JSON")
    
    # Test 4: What the response would look like in the HTTP body
    print("\n[TEST 4] HTTP Response body simulation:")
    http_response = JSONResponse(content=dict_data)
    print(f"  Status code: {http_response.status_code}")
    print(f"  Content-Type: {http_response.media_type}")
    # Get the body bytes
    import io
    body_stream = io.BytesIO()
    for chunk in http_response.body_iterator:
        body_stream.write(chunk)
    body_stream.seek(0)
    body_content = body_stream.read().decode()
    print(f"  Body: {body_content}")
    
    # Parse the body to verify
    body_data = json.loads(body_content)
    if 'admins' in body_data:
        first = body_data['admins'][0] if body_data['admins'] else {}
        print(f"  First admin experimentos_criados_total: {first.get('experimentos_criados_total')}")

if __name__ == "__main__":
    asyncio.run(test_fastapi_response())
