from google import genai
from google.genai import types
from app.config import settings

_client: genai.Client | None = None


def get_client() -> genai.Client:
    """Shared Gemini client with a request timeout and retries for rate limits and server errors."""
    if not settings.GOOGLE_API_KEY:
        raise RuntimeError("GOOGLE_API_KEY is not configured")

    global _client
    if _client is None:
        _client = genai.Client(
            api_key=settings.GOOGLE_API_KEY,
            http_options=types.HttpOptions(
                timeout=60_000,
                retry_options=types.HttpRetryOptions(attempts=4, initial_delay=1.0, max_delay=20.0),
            ),
        )
    return _client
