"""Supabase OAuth helpers for linking auth.users to researchers."""

from fastapi import HTTPException, status
from supabase import Client

from app.core.user_roles import (
    RESEARCHER_ROLE,
    is_admin_role,
    normalize_email,
    researcher_role,
)
from app.core.user_status import REGULAR_STATUS, normalize_user_status
from app.database.supabase import get_supabase_client


def get_supabase_auth_user(token: str):
    """Validate a Supabase access token and return the auth user."""
    supabase: Client = get_supabase_client()
    user_response = supabase.auth.get_user(token)

    if not user_response or not user_response.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

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


def link_auth_id(supabase: Client, researcher_id: str, auth_id: str) -> None:
    """Associate a Supabase auth user with an existing researcher row."""
    supabase.table("researchers").update({"auth_id": auth_id}).eq("id", researcher_id).execute()


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

    response = supabase.table("researchers").insert(new_user).execute()
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
) -> dict:
    """Build the login response payload from a researcher record."""
    user_type = researcher_role(researcher)
    account_status = normalize_user_status(researcher.get("status"))
    return {
        "user_id": researcher["id"],
        "id": researcher["id"],
        "name": researcher["name"],
        "email": researcher["email"],
        "institution": researcher.get("institution"),
        "phone_number": researcher.get("phone_number"),
        "instagram": researcher.get("instagram"),
        "country": researcher.get("country"),
        "language": researcher.get("language"),
        "user_type": user_type,
        "status": account_status,
        "needs_profile_completion": (
            profile_completion_pending
            if profile_completion_pending is not None
            else needs_profile_completion(researcher)
        ),
        "message": f"Welcome, {researcher['name']}!",
        "access_token": access_token,
    }
