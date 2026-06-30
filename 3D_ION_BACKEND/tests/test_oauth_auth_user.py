import pytest
from fastapi import HTTPException

from app.core.oauth import get_supabase_auth_user


def test_invalid_supabase_token_returns_401(monkeypatch):
    class FakeAuth:
        def get_user(self, jwt=None):
            from gotrue.errors import AuthApiError

            raise AuthApiError("invalid JWT", 401)

    class FakeClient:
        auth = FakeAuth()

    monkeypatch.setattr(
        "app.core.oauth.get_supabase_client",
        lambda: FakeClient(),
    )

    with pytest.raises(HTTPException) as exc:
        get_supabase_auth_user("not-a-real-token")

    assert exc.value.status_code == 401
