import uuid
from datetime import datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.database import get_db
from models.user import User
from models.refresh_token import RefreshToken
from auth.security import verify_password
from auth.jwt import create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

REFRESH_TOKEN_DAYS = 14


@router.post("/login")
def login(email: str, password: str, db: Session = Depends(get_db)):
    user = (
        db.query(User)
        .filter(User.email == email, User.active == True)
        .first()
    )

    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token({
        "sub": str(user.id),
        "role": user.role
    })

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
        "refresh_token": str(refresh_token),
        "token_type": "bearer",
        "role": user.role,
    }


@router.post("/refresh")
def refresh(refresh_token: UUID, db: Session = Depends(get_db)):
    rt = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token == refresh_token,
            RefreshToken.revoked == False,
            RefreshToken.expires_at > datetime.utcnow(),
        )
        .first()
    )

    if not rt:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = db.query(User).filter(User.id == rt.user_id, User.active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    new_access = create_access_token({
        "sub": str(user.id),
        "role": user.role
    })

    return {"access_token": new_access, "token_type": "bearer", "role": user.role}


@router.post("/logout")
def logout(refresh_token: UUID, db: Session = Depends(get_db)):
    rt = db.query(RefreshToken).filter(RefreshToken.token == refresh_token).first()
    if rt:
        rt.revoked = True
        db.commit()
    return {"ok": True}
