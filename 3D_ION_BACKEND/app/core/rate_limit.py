"""Simple in-memory rate limiting for auth endpoints."""

import time
from collections import defaultdict
from threading import Lock

from fastapi import HTTPException, Request, status

from app.core.config import settings

_lock = Lock()
_attempts: dict[str, list[float]] = defaultdict(list)

AUTH_RATE_LIMIT_PATHS = {
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/change-password",
}


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def check_rate_limit(request: Request, *, max_requests: int = 10, window_seconds: int = 60) -> None:
    if settings.DEBUG:
        return

    path = request.url.path.rstrip("/") or "/"
    if path not in AUTH_RATE_LIMIT_PATHS:
        return

    key = f"{_client_key(request)}:{path}"
    now = time.time()
    cutoff = now - window_seconds

    with _lock:
        _attempts[key] = [t for t in _attempts[key] if t > cutoff]
        if len(_attempts[key]) >= max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
            )
        _attempts[key].append(now)
