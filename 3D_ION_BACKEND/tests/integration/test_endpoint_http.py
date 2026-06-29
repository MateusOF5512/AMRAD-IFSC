#!/usr/bin/env python
"""
Test the actual GET /admin/administrators endpoint via HTTP
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import asyncio
from fastapi.testclient import TestClient
from app.main import app
import os
from load_env import load_project_env

# Load environment variables
load_project_env()

def test_admin_administrators_endpoint():
    """Test the actual endpoint response"""
    client = TestClient(app)
    
    # Get a valid token
    # For testing, we'll use this function to login
    # First, let's try to get the response from the endpoint
    
    print("=" * 80)
    print("Testing GET /admin/administrators endpoint")
    print("=" * 80)
    
    # Try to call the endpoint without authentication first to see what happens
    # Actually, let's check if we can authenticate using TestClient
    
    # First let's check if there's a test token or test account
    # Let's try with a dummy token to see the error
    headers = {
        "Authorization": "Bearer dummy_token_for_testing"
    }
    
    response = client.get("/admin/administrators", headers=headers)
    print(f"\n[TEST] Response status: {response.status_code}")
    print(f"[TEST] Response headers: {dict(response.headers)}")
    print(f"[TEST] Response body:")
    try:
        import json
        body = response.json()
        print(json.dumps(body, indent=2))
    except:
        print(response.text)

if __name__ == "__main__":
    test_admin_administrators_endpoint()
