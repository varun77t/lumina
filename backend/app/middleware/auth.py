import logging

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

ASYMMETRIC_ALGORITHMS = {"ES256", "RS256", "EdDSA"}
DEV_USER = {"sub": "dev-user-id", "email": "dev@lumina.ai"}

_jwks_client: jwt.PyJWKClient | None = None


def _get_jwks_client() -> jwt.PyJWKClient:
    """Signing keys for projects on Supabase's asymmetric JWT keys, cached between requests."""
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = jwt.PyJWKClient(
            f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json",
            cache_keys=True,
            lifespan=600,
            timeout=10,
        )
    return _jwks_client


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(status_code=401, detail=detail, headers={"WWW-Authenticate": "Bearer"})


def _bypass_user(token: str | None) -> dict:
    """AUTH_BYPASS mode: trust the token's claims without checking the signature."""
    if token:
        try:
            claims = jwt.decode(token, options={"verify_signature": False})
            if claims.get("sub"):
                return {"sub": claims["sub"], "email": claims.get("email", "")}
        except jwt.PyJWTError:
            pass
    return DEV_USER


def _decode_supabase_token(token: str) -> dict:
    algorithm = jwt.get_unverified_header(token).get("alg")

    if algorithm == "HS256":
        if not settings.SUPABASE_JWT_SECRET:
            logger.error("Received an HS256 token but SUPABASE_JWT_SECRET is not set")
            raise _unauthorized("Server authentication is not configured")
        key = settings.SUPABASE_JWT_SECRET
    elif algorithm in ASYMMETRIC_ALGORITHMS:
        if not settings.SUPABASE_URL:
            logger.error("Received a %s token but SUPABASE_URL is not set", algorithm)
            raise _unauthorized("Server authentication is not configured")
        key = _get_jwks_client().get_signing_key_from_jwt(token).key
    else:
        raise _unauthorized("Invalid token: unsupported signing algorithm")

    return jwt.decode(
        token,
        key,
        algorithms=[algorithm],
        audience="authenticated",
        leeway=30,
        options={"require": ["exp", "sub"]},
    )


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verify a Supabase access token and return the user's id and email."""
    token = credentials.credentials if credentials else None

    if settings.AUTH_BYPASS:
        return _bypass_user(token)

    if not token:
        raise _unauthorized("Missing authorization token")

    try:
        claims = _decode_supabase_token(token)
    except jwt.PyJWKClientConnectionError:
        logger.exception("Could not fetch Supabase signing keys")
        raise HTTPException(status_code=503, detail="Authentication service is unavailable")
    except jwt.PyJWTError as e:
        raise _unauthorized(f"Invalid token: {e}")

    return {"sub": claims["sub"], "email": claims.get("email", "")}
