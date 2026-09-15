import os
from dotenv import load_dotenv

load_dotenv()

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLACEHOLDER_SECRETS = {"your-supabase-jwt-secret"}


def _env_flag(name: str) -> bool:
    return os.getenv(name, "").strip().lower() in {"1", "true", "yes", "on"}


def _env_secret(name: str) -> str:
    value = os.getenv(name, "").strip()
    return "" if value in PLACEHOLDER_SECRETS else value


class Settings:
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "").strip()
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "gemini-embedding-001")

    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    SUPABASE_JWT_SECRET: str = _env_secret("SUPABASE_JWT_SECRET")
    # Local development only: accept any token without verifying it
    AUTH_BYPASS: bool = _env_flag("AUTH_BYPASS")

    # Railway sets RAILWAY_VOLUME_MOUNT_PATH when a persistent volume is attached
    DATA_DIR: str = os.getenv("DATA_DIR", "").strip() or os.getenv("RAILWAY_VOLUME_MOUNT_PATH", "").strip() or BACKEND_DIR
    UPLOAD_DIR: str = os.path.join(DATA_DIR, "uploads")
    # Folder name kept from the original ChromaDB setup so existing indexes stay readable
    VECTOR_DIR: str = os.path.join(DATA_DIR, "chroma_db")
    MAX_UPLOAD_MB: int = int(os.getenv("MAX_UPLOAD_MB", "20"))

    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50
    TOP_K_RESULTS: int = 5


settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.VECTOR_DIR, exist_ok=True)
