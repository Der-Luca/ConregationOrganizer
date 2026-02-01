import uuid
from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel

from db.database import get_db
from models.user import User
from models.refresh_token import RefreshToken
from auth.security import verify_password
from auth.jwt import create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

REFRESH_TOKEN_DAYS = 14

# ------------------------------------------------------------------
# Schemas
# ------------------------------------------------------------------

class LoginRequest(BaseModel):
    identifier: str  # username ODER email
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    roles: list[str]


class RefreshRequest(BaseModel):
    refresh_token: UUID


class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    roles: list[str]


# ------------------------------------------------------------------
# Routes
# ------------------------------------------------------------------

@router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    identifier = data.identifier.strip().lower()

    user = (
        db.query(User)
        .filter(
            User.active == True,
            or_(
                User.email.ilike(identifier),
                User.username.ilike(identifier),
            ),
        )
        .first()
    )

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    access_token = create_access_token(
        {
            "sub": str(user.id),
            "roles": user.roles,
        }
    )

    refresh_token = uuid.uuid4()

    db.add(
        RefreshToken(
            user_id=user.id,
            token=refresh_token,
            expires_at=datetime.utcnow() + timedelta(days=REFRESH_TOKEN_DAYS),
            revoked=False,
        )
    )
    db.commit()

    return {
        "access_token": access_token,
        "roles": user.roles,
    }


@router.post("/refresh", response_model=RefreshResponse)
def refresh(data: RefreshRequest, db: Session = Depends(get_db)):
    rt = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token == data.refresh_token,
            RefreshToken.revoked == False,
            RefreshToken.expires_at > datetime.utcnow(),
        )
        .first()
    )

    if not rt:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user = (
        db.query(User)
        .filter(User.id == rt.user_id, User.active == True)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    new_access_token = create_access_token(
        {
            "sub": str(user.id),
            "roles": user.roles,
        }
    )

    return {
        "access_token": new_access_token,
        "roles": user.roles,
    }


@router.post("/logout")
def logout(data: RefreshRequest, db: Session = Depends(get_db)):
    rt = (
        db.query(RefreshToken)
        .filter(RefreshToken.token == data.refresh_token)
        .first()
    )

    if rt:
        rt.revoked = True
        db.commit()

    return {"ok": True}
