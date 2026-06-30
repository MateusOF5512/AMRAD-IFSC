from typing import Optional
from datetime import datetime, timedelta, timezone
from uuid import UUID
from fastapi import HTTPException, Security, status, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client
import jwt

from app.database.supabase import get_supabase_client
from app.core.config import settings
from app.core.user_roles import normalize_user_type, researcher_role
from app.core.user_status import normalize_user_status, ensure_account_is_active, ensure_write_access


class CustomHTTPBearer(HTTPBearer):
    """Custom HTTP Bearer that returns 401 instead of 403"""
    async def __call__(self, request: Request) -> HTTPAuthorizationCredentials:
        try:
            return await super().__call__(request)
        except HTTPException as e:
            # HTTPBearer raises 403 by default, we want 401
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing or invalid authorization header",
                headers={"WWW-Authenticate": "Bearer"},
            )


security_scheme = CustomHTTPBearer()
optional_security_scheme = HTTPBearer(auto_error=False)


def create_access_token(user_id: str, user_email: str, user_type: str = "pesquisador") -> str:
    """
    Create a JWT access token for the user
    
    Args:
        user_id: Unique user identifier
        user_email: User email address
        user_type: User type (admin or pesquisador)
    """
    payload = {
        "sub": user_id,
        "email": user_email,
        "user_type": user_type,
        "exp": datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return token


def verify_jwt_token(token: str) -> dict:
    """
    Verify a JWT token and return payload
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def _refresh_user_from_db(user_id: str) -> dict:
    supabase = get_supabase_client()
    response = (
        supabase.table("researchers")
        .select("user_type, status")
        .eq("id", user_id)
        .execute()
    )
    if not response.data:
        return {"user_type": "pesquisador", "status": "regular"}
    row = response.data[0]
    return {
        "user_type": researcher_role(row),
        "status": normalize_user_status(row.get("status")),
    }


def _user_context_from_researcher(researcher: dict, email: str | None = None) -> dict:
    user_type = researcher_role(researcher)
    account_status = normalize_user_status(researcher.get("status"))
    return {
        "user_id": researcher["id"],
        "email": researcher.get("email") or email,
        "user_type": user_type,
        "role": user_type,
        "status": account_status,
    }



def verify_supabase_token(token: str) -> dict:
    """
    Verify JWT token (custom or Supabase) and return user data.

    Custom JWTs carry the researcher id directly.
    Supabase tokens are resolved to the matching researchers row.
    user_type is always read from the database (source of truth).
    """
    try:
        payload = verify_jwt_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        db_user = _refresh_user_from_db(user_id)
        user_type = db_user["user_type"]
        account_status = db_user["status"]
        return {
            "user_id": user_id,
            "email": payload.get("email"),
            "user_type": user_type,
            "role": user_type,
            "status": account_status,
        }
    except HTTPException:
        pass

    try:
        from app.core.oauth import find_researcher_by_auth, get_supabase_auth_user, link_auth_id

        supabase: Client = get_supabase_client()
        auth_user = get_supabase_auth_user(token)
        researcher = find_researcher_by_auth(supabase, auth_user.id, auth_user.email)

        if not researcher:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Researcher profile not found. Complete registration first.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not researcher.get("auth_id"):
            link_auth_id(supabase, researcher["id"], auth_user.id)
            researcher["auth_id"] = auth_user.id

        return _user_context_from_researcher(researcher, auth_user.email)

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(optional_security_scheme),
) -> Optional[dict]:
    """Return authenticated user when a valid Bearer token is present, else None."""
    if not credentials:
        return None
    try:
        return verify_supabase_token(credentials.credentials)
    except HTTPException:
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security_scheme)
) -> dict:
    """
    Dependency to get current authenticated user
    
    Raises:
        HTTPException: 401 if token is invalid or missing
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return verify_supabase_token(credentials.credentials)


async def require_write_access(
    credentials: HTTPAuthorizationCredentials = Security(security_scheme),
) -> dict:
    """Authenticated user allowed to create or modify research data."""
    current_user = await get_current_user(credentials)
    ensure_write_access(current_user)
    return current_user


def verify_sample_access(sample_id: UUID | str, current_user: dict) -> None:
    """Allow sample owner or admin to access sample-scoped resources."""
    if current_user.get("user_type") == "admin":
        return

    supabase = get_supabase_client()
    response = (
        supabase.table("samples")
        .select("researcher_id")
        .eq("id", str(sample_id))
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sample not found",
        )

    if response.data[0].get("researcher_id") != current_user.get("user_id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
