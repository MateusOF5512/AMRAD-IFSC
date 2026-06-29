#!/usr/bin/env python
"""Integration test for admin endpoint with JWT from environment."""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.main import app
from load_env import load_project_env

load_project_env()


def test_admin_endpoint_with_real_token():
    client = TestClient(app)

    admin_id = os.getenv("TEST_ADMIN_USER_ID") or os.getenv("TEST_USER_ID")
    admin_email = os.getenv("TEST_EMAIL")

    if not admin_id or not admin_email:
        print("ERROR: Set TEST_ADMIN_USER_ID (or TEST_USER_ID) and TEST_EMAIL in root .env")
        return

    token = create_access_token(
        user_id=admin_id,
        user_email=admin_email,
        user_type="admin",
    )

    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/admin/users?status=regular&page=1&per_page=10", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Users returned: {len(data.get('users', []))}")
    else:
        print(response.text)


if __name__ == "__main__":
    test_admin_endpoint_with_real_token()
