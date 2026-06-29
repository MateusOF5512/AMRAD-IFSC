"""
Diagnostics endpoints — available only in DEBUG mode.
"""

from fastapi import APIRouter, HTTPException, Request, status

from app.core.config import settings

router = APIRouter(prefix="/diagnostics", tags=["Diagnostics"])


def _require_debug() -> None:
    if not settings.DEBUG:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


@router.get("/cors", tags=["Diagnostics"])
async def check_cors(request: Request):
    _require_debug()
    origin = request.headers.get("origin", "Not provided")
    referer = request.headers.get("referer", "Not provided")

    return {
        "status": "ok",
        "cors_configuration": {
            "allowed_origins": settings.BACKEND_CORS_ORIGINS,
            "allow_credentials": True,
        },
        "request_details": {
            "origin": origin,
            "referer": referer,
            "is_origin_allowed": origin in settings.BACKEND_CORS_ORIGINS
            if origin != "Not provided"
            else "Unknown",
        },
    }


@router.get("/config", tags=["Diagnostics"])
async def get_config():
    _require_debug()
    return {
        "api_v1_prefix": settings.API_V1_PREFIX,
        "project_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "debug": settings.DEBUG,
    }
