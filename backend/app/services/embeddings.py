import hashlib
import logging
import math
import re
from google.genai import types
from app.config import settings
from app.services.gemini import get_client

logger = logging.getLogger(__name__)

# The Gemini API accepts at most 100 texts per embedding request
BATCH_SIZE = 100
HASH_DIMENSIONS = 384


class EmbeddingError(RuntimeError):
    """Embeddings could not be generated, e.g. the Gemini API is unreachable or rate limited."""


def _hash_embedding(text: str, dimensions: int = HASH_DIMENSIONS) -> list[float]:
    """Deterministic keyword embedding for local development without a Gemini key."""
    vector = [0.0] * dimensions
    tokens = re.findall(r"[A-Za-z0-9]+", text.lower())

    for token in tokens:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], "big") % dimensions
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vector[index] += sign

    norm = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [value / norm for value in vector]


def _gemini_embeddings(texts: list[str], task_type: str) -> list[list[float]]:
    client = get_client()
    vectors = []

    for start in range(0, len(texts), BATCH_SIZE):
        batch = texts[start:start + BATCH_SIZE]
        try:
            response = client.models.embed_content(
                model=settings.EMBEDDING_MODEL,
                contents=batch,
                config=types.EmbedContentConfig(task_type=task_type),
            )
        except Exception as e:
            logger.exception("Gemini embedding request failed")
            raise EmbeddingError("The embedding service is unavailable. Please try again shortly.") from e

        embeddings = response.embeddings or []
        if len(embeddings) != len(batch):
            raise EmbeddingError(f"Expected {len(batch)} embeddings from Gemini but received {len(embeddings)}")
        vectors.extend(list(embedding.values) for embedding in embeddings)

    return vectors


def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """Generate document embeddings.

    The provider depends only on configuration, never on whether a request happened to fail,
    so a document and the questions asked about it are always embedded the same way.
    """
    if not settings.GOOGLE_API_KEY:
        return [_hash_embedding(text) for text in texts]
    return _gemini_embeddings(texts, "RETRIEVAL_DOCUMENT")


def generate_single_embedding(text: str) -> list[float]:
    """Generate the embedding for a search query."""
    if not settings.GOOGLE_API_KEY:
        return _hash_embedding(text)
    return _gemini_embeddings([text], "RETRIEVAL_QUERY")[0]
