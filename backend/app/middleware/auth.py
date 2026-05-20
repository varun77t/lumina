from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.config import settings

security = HTTPBearer(auto_error=False)


async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verify Supabase JWT token and return user data."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing authorization token")

    token = credentials.credentials

    # If secret is unconfigured or a placeholder, gracefully parse unverified claims for seamless local testing
    if not settings.SUPABASE_JWT_SECRET or settings.SUPABASE_JWT_SECRET == "your-supabase-jwt-secret":
        try:
            payload = jwt.get_unverified_claims(token)
            user_id = payload.get("sub")
            email = payload.get("email", "dev@lumina.ai")
            if user_id:
                return {"sub": user_id, "email": email}
        except Exception:
            pass
        return {"sub": "dev-user", "email": "dev@lumina.ai"}

    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
        user_id = payload.get("sub")
        email = payload.get("email", "")

        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: no user ID")

        return {"sub": user_id, "email": email}

    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
