"""Supabase OAuth helpers for linking auth.users to researchers."""

from fastapi import HTTPException, status
from supabase import Client

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


def find_researcher_by_auth(supabase: Client, auth_id: str, email: str | None):
    """Find a researcher by auth_id or email."""
    by_auth = (
        supabase.table("researchers")
        .select("*")
        .eq("auth_id", auth_id)
        .execute()
    )
    if by_auth.data:
        return by_auth.data[0]

    if email:
        by_email = (
            supabase.table("researchers")
            .select("*")
            .eq("email", email.strip().lower())
            .execute()
        )
        if by_email.data:
            return by_email.data[0]

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

    email = auth_user.email.strip().lower()
    new_user = {
        "name": google_display_name(auth_user) or email,
        "email": email,
        "auth_id": auth_user.id,
        "user_type": "pesquisador",
        "status": "regular",
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
        "user_type": researcher.get("user_type", "pesquisador"),
        "needs_profile_completion": (
            profile_completion_pending
            if profile_completion_pending is not None
            else needs_profile_completion(researcher)
        ),
        "message": f"Welcome, {researcher['name']}!",
        "access_token": access_token,
    }
