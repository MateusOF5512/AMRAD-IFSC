"""CORS helpers for error responses that bypass the CORS middleware."""

import re

from fastapi import Request
from starlette.responses import Response

from app.core.config import settings

_CORS_REGEX = (
    re.compile(settings.BACKEND_CORS_ORIGIN_REGEX)
    if settings.BACKEND_CORS_ORIGIN_REGEX
    else None
)


def is_origin_allowed(origin: str) -> bool:
    if origin in settings.BACKEND_CORS_ORIGINS:
        return True
    if _CORS_REGEX and _CORS_REGEX.match(origin):
        return True
    return False


def apply_cors_headers(request: Request, response: Response) -> Response:
    """Ensure browser clients can read error payloads on cross-origin requests."""
    origin = request.headers.get("origin")
    if origin and is_origin_allowed(origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers.setdefault("Vary", "Origin")
    return response
