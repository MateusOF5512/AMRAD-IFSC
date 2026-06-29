#!/usr/bin/env python3
"""Test pagination with per_page=100 using credentials from root .env."""
import os
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from load_env import load_project_env
from app.core.security import create_access_token

load_project_env()

API_URL = os.getenv("NEXT_PUBLIC_API_URL", "http://localhost:8000/api/v1")
TEST_USER_ID = os.getenv("TEST_ADMIN_USER_ID") or os.getenv("TEST_USER_ID")
TEST_USER_EMAIL = os.getenv("TEST_EMAIL")

if not TEST_USER_ID or not TEST_USER_EMAIL:
    print("ERROR: Set TEST_ADMIN_USER_ID (or TEST_USER_ID) and TEST_EMAIL in root .env")
    sys.exit(1)

token = create_access_token(TEST_USER_ID, TEST_USER_EMAIL, user_type="admin")
headers = {"Authorization": f"Bearer {token}"}

print("Testing per_page=10")
response = requests.get(
    f"{API_URL}/admin/users?status=irregular&page=1&per_page=10",
    headers=headers,
    timeout=10,
)
print(f"Status: {response.status_code}, count: {len(response.json().get('users', []))}")

print("Testing per_page=100")
response = requests.get(
    f"{API_URL}/admin/users?status=irregular&page=1&per_page=100",
    headers=headers,
    timeout=10,
)
print(f"Status: {response.status_code}, count: {len(response.json().get('users', []))}")
