"""Admin action password verification (env-based, not per-user)."""

import secrets

from fastapi import HTTPException, status

from app.core.config import settings


def verify_admin_action_password(password: str) -> None:
    """Raise HTTPException if password does not match PASSWORD_ADMIN from env."""
    expected = settings.PASSWORD_ADMIN
    if not expected or not secrets.compare_digest(password, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Senha incorreta",
        )
