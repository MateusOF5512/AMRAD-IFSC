"""
Cache headers middleware — only cache safe public GET responses.
"""

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings


class CacheHeaderMiddleware(BaseHTTPMiddleware):
    """Apply cache headers based on route sensitivity."""

    PUBLIC_CACHE_PREFIXES = (
        f"{settings.API_V1_PREFIX}/materials/approved",
        f"{settings.API_V1_PREFIX}/machines/approved",
        f"{settings.API_V1_PREFIX}/experiments/patterns",
        f"{settings.API_V1_PREFIX}/health",
    )

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        if request.method != "GET":
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
            return response

        if request.headers.get("Authorization"):
            response.headers["Cache-Control"] = "private, no-store"
            return response

        path = request.url.path
        if path in ("/", "/test") or path.startswith(f"{settings.API_V1_PREFIX}/admin"):
            response.headers["Cache-Control"] = "private, no-store"
            return response

        if any(path.startswith(prefix) for prefix in self.PUBLIC_CACHE_PREFIXES):
            response.headers["Cache-Control"] = "public, max-age=300"
            response.headers["Vary"] = "Accept-Encoding"
        else:
            response.headers["Cache-Control"] = "private, no-store"

        return response
