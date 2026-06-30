"""Researcher account status (regular / irregular / desativado)."""

from fastapi import HTTPException, status

from app.core.user_roles import is_admin_role

REGULAR_STATUS = "regular"
IRREGULAR_STATUS = "irregular"
DEACTIVATED_STATUS = "desativado"

VALID_STATUSES = {REGULAR_STATUS, IRREGULAR_STATUS, DEACTIVATED_STATUS}


def normalize_user_status(user_status: str | None) -> str:
    if not user_status:
        return REGULAR_STATUS
    normalized = user_status.strip().lower()
    if normalized in VALID_STATUSES:
        return normalized
    return REGULAR_STATUS


def is_irregular_status(user_status: str | None) -> bool:
    return normalize_user_status(user_status) == IRREGULAR_STATUS


def is_deactivated_status(user_status: str | None) -> bool:
    return normalize_user_status(user_status) == DEACTIVATED_STATUS


def can_write_research_data(current_user: dict) -> bool:
    if is_admin_role(current_user.get("user_type")):
        return True
    return normalize_user_status(current_user.get("status")) == REGULAR_STATUS


def ensure_account_is_active(current_user: dict) -> None:
    if is_admin_role(current_user.get("user_type")):
        return

    if is_deactivated_status(current_user.get("status")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conta desativada. Entre em contato com o administrador.",
        )


def ensure_write_access(current_user: dict) -> None:
    """Block irregular and deactivated users from creating/updating research data."""
    if is_admin_role(current_user.get("user_type")):
        return

    account_status = normalize_user_status(current_user.get("status"))

    if account_status == DEACTIVATED_STATUS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conta desativada. Entre em contato com o administrador.",
        )

    if account_status == IRREGULAR_STATUS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuários irregulares possuem acesso somente leitura.",
        )
