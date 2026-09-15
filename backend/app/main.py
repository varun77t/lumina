import logging
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.routers import upload, chat, summary
from app.services.embeddings import EmbeddingError
from app.services.vector_store import IndexMismatchError

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("lumina")

app = FastAPI(
    title="Lumina AI",
    description="AI-powered PDF RAG Assistant",
    version="1.0.0"
)

if settings.AUTH_BYPASS:
    logger.warning("AUTH_BYPASS is enabled: API requests are NOT authenticated. Use this for local development only.")
if not settings.GOOGLE_API_KEY:
    logger.warning("GOOGLE_API_KEY is not set: using keyword embeddings and extractive answers instead of Gemini.")

# CORS
origins_env = os.getenv("ALLOWED_ORIGINS", "")
if origins_env:
    allow_origins = [orig.strip() for orig in origins_env.split(",") if orig.strip()]
else:
    allow_origins = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "*" # Fallback / local dev support
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True if "*" not in allow_origins else False, # credentials cannot be used with "*"
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(EmbeddingError)
async def embedding_error_handler(request: Request, exc: EmbeddingError):
    return JSONResponse(status_code=503, content={"detail": str(exc)})


@app.exception_handler(IndexMismatchError)
async def index_mismatch_handler(request: Request, exc: IndexMismatchError):
    return JSONResponse(status_code=409, content={"detail": str(exc)})


@app.get("/")
async def root():
    return {"message": "Lumina AI API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


# Include routers
app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(summary.router, prefix="/api", tags=["Summary"])
