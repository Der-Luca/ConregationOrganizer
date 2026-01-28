# auth/deps.py
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
from config import settings

security = HTTPBearer()

def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(security),
):
    try:
        payload = jwt.decode(
            creds.credentials,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

    return payload




def require_admin(current_user=Depends(get_current_user)):
    # current_user ist bei dir aktuell entweder payload (dict) oder User-Objekt
    role = current_user.get("role") if isinstance(current_user, dict) else getattr(current_user, "role", None)

    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return current_user
