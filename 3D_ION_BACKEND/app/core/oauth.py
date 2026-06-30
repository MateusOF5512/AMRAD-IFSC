"""Supabase OAuth helpers for linking auth.users to researchers."""

import logging

from fastapi import HTTPException, status
from gotrue.errors import AuthApiError
from postgrest.exceptions import APIError
from supabase import Client

from app.core.user_roles import (
    RESEARCHER_ROLE,
    is_admin_role,
    normalize_email,
    researcher_role,
)
from app.core.user_status import REGULAR_STATUS, normalize_user_status
from app.database.supabase import get_supabase_client

logger = logging.getLogger(__name__)

_INVALID_CREDENTIALS = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid authentication credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_supabase_auth_user(token: str):
    """Validate a Supabase access token and return the auth user."""
    supabase: Client = get_supabase_client()
    try:
        user_response = supabase.auth.get_user(jwt=token)
    except AuthApiError:
        raise _INVALID_CREDENTIALS from None
    except Exception:
        logger.exception("Unexpected error validating Supabase token")
        raise _INVALID_CREDENTIALS from None

    if not user_response or not user_response.user:
        raise _INVALID_CREDENTIALS

    return user_response.user


def get_researcher_by_id(supabase: Client, researcher_id: str) -> dict | None:
    response = (
        supabase.table("researchers")
        .select("*")
        .eq("id", researcher_id)
        .execute()
    )
    if response.data:
        return response.data[0]
    return None


def find_researcher_by_email(supabase: Client, email: str | None) -> dict | None:
    normalized = normalize_email(email)
    if not normalized:
        return None

    response = (
        supabase.table("researchers")
        .select("*")
        .ilike("email", normalized)
        .execute()
    )
    if not response.data:
        return None

    if len(response.data) == 1:
        return response.data[0]

    # Same email on multiple rows: prefer admin, then pre-registered (no auth_id).
    admins = [row for row in response.data if is_admin_role(row.get("user_type"))]
    if admins:
        return admins[0]

    without_auth = [row for row in response.data if not row.get("auth_id")]
    if without_auth:
        return without_auth[0]

    return response.data[0]


def _choose_researcher_on_conflict(by_auth: dict, by_email: dict) -> dict:
    """When auth_id and email point to different rows, keep the authoritative profile."""
    if by_auth["id"] == by_email["id"]:
        return by_auth

    auth_is_admin = is_admin_role(by_auth.get("user_type"))
    email_is_admin = is_admin_role(by_email.get("user_type"))

    if email_is_admin and not auth_is_admin:
        return by_email
    if auth_is_admin and not email_is_admin:
        return by_auth

    # Prefer the account that existed before OAuth (no auth_id yet).
    if not by_email.get("auth_id") and by_auth.get("auth_id"):
        return by_email
    if not by_auth.get("auth_id") and by_email.get("auth_id"):
        return by_auth

    return by_auth


def find_researcher_by_auth(supabase: Client, auth_id: str, email: str | None):
    """Find a researcher by auth_id or email, resolving OAuth/account conflicts."""
    by_auth = None
    auth_response = (
        supabase.table("researchers")
        .select("*")
        .eq("auth_id", auth_id)
        .execute()
    )
    if auth_response.data:
        by_auth = auth_response.data[0]

    by_email = find_researcher_by_email(supabase, email)

    if by_auth and by_email:
        chosen = _choose_researcher_on_conflict(by_auth, by_email)
        if not chosen.get("auth_id"):
            link_auth_id(supabase, chosen["id"], auth_id)
            chosen["auth_id"] = auth_id
        return chosen

    if by_auth:
        return by_auth

    if by_email:
        if not by_email.get("auth_id"):
            link_auth_id(supabase, by_email["id"], auth_id)
            by_email["auth_id"] = auth_id
        return by_email

    return None


def _normalize_researcher_for_login(
    researcher: dict,
    *,
    fallback_email: str | None = None,
) -> dict:
    """Ensure required login fields exist (legacy rows may have nulls)."""
    email = (researcher.get("email") or fallback_email or "").strip().lower()
    name = (researcher.get("name") or email or "User").strip()
    return {**researcher, "email": email, "name": name}


def link_auth_id(supabase: Client, researcher_id: str, auth_id: str) -> None:
    """Associate a Supabase auth user with an existing researcher row."""
    try:
        supabase.table("researchers").update({"auth_id": auth_id}).eq("id", researcher_id).execute()
    except APIError as err:
        if getattr(err, "code", None) == "23505":
            logger.warning(
                "auth_id %s already linked; skipping update for researcher %s",
                auth_id,
                researcher_id,
            )
            return
        raise


def google_display_name(auth_user) -> str:
    metadata = auth_user.user_metadata or {}
    return metadata.get("full_name") or metadata.get("name") or auth_user.email or ""


def needs_profile_completion(researcher: dict) -> bool:
    return not researcher.get("profile_onboarding_completed", False)


def create_oauth_researcher(supabase: Client, auth_user) -> dict:
    """Create a minimal researcher profile from Google OAuth data."""
    if not auth_user.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account must provide an email address",
        )

    email = normalize_email(auth_user.email)
    existing = find_researcher_by_email(supabase, email)
    if existing:
        if not existing.get("auth_id"):
            link_auth_id(supabase, existing["id"], auth_user.id)
            existing["auth_id"] = auth_user.id
        return existing

    new_user = {
        "name": google_display_name(auth_user) or email,
        "email": email,
        "auth_id": auth_user.id,
        "user_type": RESEARCHER_ROLE,
        "status": REGULAR_STATUS,
        "profile_onboarding_completed": False,
    }

    try:
        response = supabase.table("researchers").insert(new_user).execute()
    except APIError as err:
        err_message = str(err).lower()
        if "profile_onboarding_completed" in err_message and "profile_onboarding_completed" in new_user:
            new_user.pop("profile_onboarding_completed", None)
            try:
                response = supabase.table("researchers").insert(new_user).execute()
            except APIError as retry_err:
                err = retry_err
            else:
                if response.data:
                    return response.data[0]

        # Concurrent OAuth syncs can race on the same email.
        if getattr(err, "code", None) == "23505":
            raced = find_researcher_by_auth(supabase, auth_user.id, email)
            if raced:
                return raced
            raced = find_researcher_by_email(supabase, email)
            if raced:
                if not raced.get("auth_id"):
                    link_auth_id(supabase, raced["id"], auth_user.id)
                    raced["auth_id"] = auth_user.id
                return raced
        logger.exception("Failed to create OAuth researcher for %s", email)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user",
        ) from err

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user",
        )

    return response.data[0]


def researcher_to_login_payload(
    researcher: dict,
    access_token: str,
    *,
    profile_completion_pending: bool | None = None,
    fallback_email: str | None = None,
) -> dict:
    """Build the login response payload from a researcher record."""
    normalized = _normalize_researcher_for_login(researcher, fallback_email=fallback_email)
    user_type = researcher_role(normalized)
    account_status = normalize_user_status(normalized.get("status"))
    return {
        "user_id": normalized["id"],
        "id": normalized["id"],
        "name": normalized["name"],
        "email": normalized["email"],
        "institution": normalized.get("institution"),
        "phone_number": normalized.get("phone_number"),
        "instagram": normalized.get("instagram"),
        "country": normalized.get("country"),
        "language": normalized.get("language"),
        "user_type": user_type,
        "status": account_status,
        "needs_profile_completion": (
            profile_completion_pending
            if profile_completion_pending is not None
            else needs_profile_completion(normalized)
        ),
        "message": f"Welcome, {normalized['name']}!",
        "access_token": access_token,
    }
