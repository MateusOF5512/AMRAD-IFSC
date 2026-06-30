"""Helpers for researcher role checks (admin vs pesquisador)."""

ADMIN_ROLE = "admin"
RESEARCHER_ROLE = "pesquisador"


def normalize_email(email: str | None) -> str | None:
    if not email:
        return None
    return email.strip().lower()


def normalize_user_type(user_type: str | None) -> str:
    if not user_type:
        return RESEARCHER_ROLE
    normalized = user_type.strip().lower()
    return ADMIN_ROLE if normalized == ADMIN_ROLE else RESEARCHER_ROLE


def is_admin_role(user_type: str | None) -> bool:
    return normalize_user_type(user_type) == ADMIN_ROLE


def researcher_role(researcher: dict) -> str:
    return normalize_user_type(researcher.get("user_type"))
