import hashlib
import math
import re
from app.config import settings

try:
    from sentence_transformers import SentenceTransformer
except Exception:
    SentenceTransformer = None

try:
    import google.generativeai as genai
except Exception:
    genai = None

_model = None


def get_model():
    """Get or initialize the sentence transformer model."""
    global _model
    if SentenceTransformer is None:
        return None
    if _model is None:
        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
    return _model


def _hash_embedding(text: str, dimensions: int = 384) -> list[float]:
    """Deterministic fallback embedding for local development without sentence-transformers."""
    vector = [0.0] * dimensions
    tokens = re.findall(r"[A-Za-z0-9]+", text.lower())

    for token in tokens:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], "big") % dimensions
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vector[index] += sign

    norm = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [value / norm for value in vector]


def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for a list of texts."""
    # 1. Try Gemini Embeddings API first if key is configured
    if settings.GOOGLE_API_KEY and genai is not None:
        try:
            genai.configure(api_key=settings.GOOGLE_API_KEY)
            result = genai.embed_content(
                model="models/gemini-embedding-001",
                content=texts,
                task_type="retrieval_document"
            )
            return result["embedding"]
        except Exception:
            pass

    # 2. Try sentence-transformers if installed
    model = get_model()
    if model is not None:
        embeddings = model.encode(texts, show_progress_bar=False)
        return embeddings.tolist()

    # 3. Dummy hash embedding fallback
    return [_hash_embedding(text) for text in texts]


def generate_single_embedding(text: str) -> list[float]:
    """Generate embedding for a single text."""
    if settings.GOOGLE_API_KEY and genai is not None:
        try:
            genai.configure(api_key=settings.GOOGLE_API_KEY)
            result = genai.embed_content(
                model="models/gemini-embedding-001",
                content=text,
                task_type="retrieval_query"
            )
            return result["embedding"]
        except Exception:
            pass

    return generate_embeddings([text])[0]
