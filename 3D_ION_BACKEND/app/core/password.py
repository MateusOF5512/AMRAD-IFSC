"""Centralized password hashing and verification."""

import bcrypt


def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.strip().encode("utf-8"),
            hashed_password.strip().encode("utf-8"),
        )
    except Exception:
        return False
