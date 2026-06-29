"""Shared user lookup helpers."""

import logging

from app.database.supabase import get_supabase_client

logger = logging.getLogger(__name__)


async def get_user_full_name(user_id: str) -> str:
    """Return researcher name, falling back to email or user_id."""
    try:
        supabase = get_supabase_client()
        response = (
            supabase.table("researchers")
            .select("id, name, email")
            .eq("id", user_id)
            .execute()
        )

        if response.data:
            user = response.data[0]
            return user.get("name") or user.get("email", user_id)

        return user_id
    except Exception as exc:
        logger.warning("Failed to fetch user name for %s: %s", user_id, exc)
        return user_id
