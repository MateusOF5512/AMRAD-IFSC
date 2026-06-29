from typing import Optional
from datetime import datetime, timedelta, timezone
from uuid import UUID
from fastapi import HTTPException, Security, status, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client
import jwt

from app.database.supabase import get_supabase_client
from app.core.config import settings


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


def _normalize_user_context(payload: dict) -> dict:
    user_type = payload.get("user_type") or payload.get("role") or "pesquisador"
    return {
        "user_id": payload.get("sub"),
        "email": payload.get("email"),
        "user_type": user_type,
        "role": user_type,
    }


def verify_supabase_token(token: str) -> dict:
    """
    Verify JWT token (custom or Supabase) and return user data
    
    First tries to verify as a custom JWT token (from our login endpoint).
    Falls back to Supabase token validation if needed.
    """
    try:
        payload = verify_jwt_token(token)
        return _normalize_user_context(payload)
    except HTTPException:
        pass
    
    # Try Supabase token verification
    try:
        supabase: Client = get_supabase_client()
        
        # Use Supabase client to get user from token
        user_response = supabase.auth.get_user(token)
        
        if not user_response or not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user_type = user_response.user.user_metadata.get("user_type") or user_response.user.user_metadata.get("role", "pesquisador")
        return {
            "user_id": user_response.user.id,
            "email": user_response.user.email,
            "user_type": user_type,
            "role": user_type,
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


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
