from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db.database import get_db
from models.user import User
from models.invite_token import InviteToken
from schemas.user import RegisterRequest, TokenValidationResponse
from auth.security import hash_password

router = APIRouter(prefix="/register", tags=["Registration"])


@router.get("/{token}", response_model=TokenValidationResponse)
def validate_token(
    token: str,
    db: Session = Depends(get_db),
):
    """Validate an invite token and return user info if valid."""

    invite = (
        db.query(InviteToken)
        .filter(InviteToken.token == token)
        .first()
    )

    if not invite:
        return TokenValidationResponse(
            valid=False,
            error="Invalid token",
        )

    if invite.used_at is not None:
        return TokenValidationResponse(
            valid=False,
            error="This invitation link has already been used",
        )

    if invite.expires_at < datetime.now(timezone.utc):
        return TokenValidationResponse(
            valid=False,
            error="This invitation link has expired",
        )

    user = db.query(User).filter(User.id == invite.user_id).first()
    if not user:
        return TokenValidationResponse(
            valid=False,
            error="User not found",
        )

    return TokenValidationResponse(
        valid=True,
        user_firstname=user.firstname,
        expires_at=invite.expires_at,
    )


@router.post("/{token}")
def complete_registration(
    token: str,
    data: RegisterRequest,
    db: Session = Depends(get_db),
):
    """Complete user registration by setting password."""

    invite = (
        db.query(InviteToken)
        .filter(InviteToken.token == token)
        .first()
    )

    if not invite:
        raise HTTPException(status_code=400, detail="Invalid token")

    if invite.used_at is not None:
        raise HTTPException(
            status_code=400, detail="This invitation link has already been used"
        )

    if invite.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This invitation link has expired")

    user = db.query(User).filter(User.id == invite.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    if user.password_hash is not None:
        raise HTTPException(status_code=400, detail="User has already registered")

    # Set the password
    user.password_hash = hash_password(data.password)

    # Mark token as used
    invite.used_at = datetime.now(timezone.utc)

    db.commit()

    return {"message": "Registration complete. You can now log in."}
