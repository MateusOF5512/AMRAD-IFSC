"""Carrega variáveis de ambiente do .env na raiz do monorepo (3D_ION/.env)."""
from pathlib import Path

from dotenv import load_dotenv

MONOREPO_ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = MONOREPO_ROOT / ".env"


def load_project_env() -> Path:
    """Carrega o .env da raiz do projeto, se existir."""
    if ENV_FILE.exists():
        load_dotenv(ENV_FILE, override=False)
    return ENV_FILE
