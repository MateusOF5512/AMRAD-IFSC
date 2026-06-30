from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, model_validator
import os

from load_env import ENV_FILE, load_project_env

load_project_env()


def get_cors_origins() -> list[str]:
    """Build CORS origins list from environment variables"""
    debug = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")
    origins: list[str] = []

    if debug:
        origins.extend([
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
            "http://localhost:3001",
            "http://localhost:3002",
            "http://localhost:8080",
        ])
    
    # Add custom frontend URL from environment if provided
    frontend_url = os.getenv("FRONTEND_URL")
    if frontend_url and frontend_url not in origins:
        origins.append(frontend_url)
    
    # Add any additional URLs from environment variable
    extra_origins = os.getenv("EXTRA_CORS_ORIGINS")
    if extra_origins:
        for origin in extra_origins.split(","):
            origin = origin.strip()
            if origin and origin not in origins:
                origins.append(origin)
    
    return origins


def get_cors_origin_regex() -> str | None:
    """
    In DEBUG, allow LAN origins (e.g. http://192.168.x.x:3000 from Next.js Network URL).
    """
    debug = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")
    if not debug:
        return None
    return (
        r"^https?://"
        r"(localhost|127\.0\.0\.1|"
        r"192\.168\.\d{1,3}\.\d{1,3}|"
        r"10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
        r"172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})"
        r"(:\d+)?$"
    )


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_ANON_KEY: str
    
    # Senha para confirmação de ações sensíveis no painel admin
    PASSWORD_ADMIN: str = Field(..., min_length=1)

    # JWT — obrigatório via .env (sem default fraco em produção)
    JWT_SECRET: str = Field(..., min_length=16)
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # API
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "AMRAD API"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # CORS - Allow multiple origins for development and production
    # Using Field(default_factory=...) to ensure function is called on each instance creation
    BACKEND_CORS_ORIGINS: list[str] = Field(default_factory=get_cors_origins)
    BACKEND_CORS_ORIGIN_REGEX: str | None = Field(default_factory=get_cors_origin_regex)
    
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        case_sensitive=True,
        extra="ignore"
    )

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        if self.DEBUG:
            return self

        weak_secrets = {
            "dev-secret-key-change-in-production",
            "uma-string-secreta-longa-e-aleatoria",
            "string-secreta-longa-e-aleatoria",
            "qualquer-string-secreta-aqui",
            "change-me",
        }
        secret_len = len(self.JWT_SECRET)
        if self.JWT_SECRET in weak_secrets:
            raise ValueError(
                "JWT_SECRET is a known development placeholder. "
                "Set a unique random string (32+ chars) in Render → Environment "
                "(local .env is not deployed)."
            )
        if secret_len < 32:
            raise ValueError(
                f"JWT_SECRET is too short ({secret_len} chars). "
                "Use a strong random string with at least 32 characters when DEBUG=False."
            )
        return self


settings = Settings()
