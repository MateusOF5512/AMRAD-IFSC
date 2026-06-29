from supabase import create_client, Client
from functools import lru_cache

from app.core.config import settings


@lru_cache()
def get_supabase_client() -> Client:
    """
    Get Supabase client with Service Role Key
    
    IMPORTANT: Service Role Key bypasses RLS (Row Level Security)
    Use this ONLY in backend. Never expose this key to frontend.
    """
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY
    )


def get_supabase_anon_client() -> Client:
    """
    Get Supabase client with Anon Key
    Used for operations that respect RLS policies
    """
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_ANON_KEY
    )
