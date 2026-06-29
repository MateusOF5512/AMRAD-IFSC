#!/usr/bin/env python
"""Test the /admin/experiments endpoint"""
import os
import sys
from pathlib import Path

from load_env import load_project_env

load_project_env()

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.main import app

client = TestClient(app)

test_user_id = os.getenv("TEST_ADMIN_USER_ID") or os.getenv("TEST_USER_ID")
test_email = os.getenv("TEST_EMAIL")

if not test_user_id or not test_email:
    print("ERROR: Set TEST_ADMIN_USER_ID (or TEST_USER_ID) and TEST_EMAIL in root .env")
    sys.exit(1)

token = create_access_token(user_id=test_user_id, user_email=test_email, user_type="admin")
headers = {"Authorization": f"Bearer {token}"}

response = client.get("/api/v1/admin/experiments", headers=headers)
print(f"Status: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    print(f"Approved experiments: {data.get('total_approved')}")
    print(f"In-analysis experiments: {data.get('total_in_analysis')}")
else:
    print(response.text)
