from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware

from app.core.config import settings
from app.core.apm_middleware import APMMiddleware, RequestContextMiddleware
from app.core.cache_headers import CacheHeaderMiddleware
from app.core.security_headers import SecurityHeadersMiddleware
from app.core.rate_limit import check_rate_limit
from app.routers import materials, machines, samples, experiments, auth, users, admin, logs, diagnostics, analysis

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="REST API for AMRAD - Scientific experiment management system",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

app.add_middleware(RequestContextMiddleware)
app.add_middleware(APMMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(CacheHeaderMiddleware)
app.add_middleware(SecurityHeadersMiddleware)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    check_rate_limit(request)
    return await call_next(request)


@app.get("/", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }


if settings.DEBUG:

    @app.get("/test", tags=["Test"])
    async def test_endpoint():
        return {"message": "Test endpoint works"}


app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(users.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin.router, prefix=settings.API_V1_PREFIX)
app.include_router(materials.router, prefix=settings.API_V1_PREFIX)
app.include_router(machines.router, prefix=settings.API_V1_PREFIX)
app.include_router(samples.router, prefix=settings.API_V1_PREFIX)
app.include_router(experiments.router, prefix=settings.API_V1_PREFIX)
app.include_router(logs.router, prefix=settings.API_V1_PREFIX)
app.include_router(diagnostics.router, prefix=settings.API_V1_PREFIX)
app.include_router(analysis.router, prefix=settings.API_V1_PREFIX)


@app.get(f"{settings.API_V1_PREFIX}/health", tags=["Health"])
async def health_check_v1():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "api_version": "v1",
    }


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "HTTP Exception",
            "detail": exc.detail,
            "status_code": exc.status_code,
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
