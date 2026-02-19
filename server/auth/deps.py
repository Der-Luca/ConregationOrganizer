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
    roles = current_user.get("roles") if isinstance(current_user, dict) else getattr(current_user, "roles", [])

    if "admin" not in (roles or []):
        raise HTTPException(status_code=403, detail="Admin only")
    return current_user


def require_cartplanner(current_user=Depends(get_current_user)):
    roles = current_user.get("roles") if isinstance(current_user, dict) else getattr(current_user, "roles", [])

    if "cartplanner" not in (roles or []) and "admin" not in (roles or []):
        raise HTTPException(status_code=403, detail="Cart planner or admin only")
    return current_user


def require_fieldserviceplanner(current_user=Depends(get_current_user)):
    roles = current_user.get("roles") if isinstance(current_user, dict) else getattr(current_user, "roles", [])

    if "fieldserviceplanner" not in (roles or []) and "admin" not in (roles or []):
        raise HTTPException(status_code=403, detail="Field service planner or admin only")
    return current_user


def require_talk_assistant(current_user=Depends(get_current_user)):
    roles = current_user.get("roles") if isinstance(current_user, dict) else getattr(current_user, "roles", [])

    if "talk_assistant" not in (roles or []) and "admin" not in (roles or []):
        raise HTTPException(status_code=403, detail="Talk assistant or admin only")
    return current_user
