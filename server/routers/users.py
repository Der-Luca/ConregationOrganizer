import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from db.database import get_db
from models.user import User
from models.invite_token import InviteToken
from schemas.user import (
    UserOut,
    UserCreate,
    UserCreateResponse,
    UserUpdateRoles,
    UsernameCheckResponse,
)
from auth.deps import require_admin
from utils.usernames import (
    generate_unique_username,
    is_username_available,
    slugify_username,
    get_suggested_username,
)
from auth.deps import require_admin, get_current_user



router = APIRouter(prefix="/users", tags=["Users"])

INVITE_TOKEN_EXPIRY_DAYS = 7
PROTECTED_USERNAME = "congregation-admin"


def user_to_out(user: User) -> UserOut:
    """Convert User model to UserOut schema with has_password computed."""
    return UserOut(
        id=user.id,
        firstname=user.firstname,
        lastname=user.lastname,
        username=user.username,
        email=user.email,
        roles=user.roles,
        active=user.active,
        created_at=user.created_at,
        has_password=user.password_hash is not None,
    )

@router.get("/me", response_model=UserOut)
def get_me(
    payload=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.id == payload["sub"])
        .first()
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user_to_out(user)



@router.get("/bookable-users", response_model=list[UserOut])
def list_bookable_users(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return [
        user_to_out(u)
        for u in db.query(User).filter(User.active == True).all()
    ]



@router.get("", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    users = db.query(User).all()
    return [user_to_out(u) for u in users]


@router.get("/check-username/{username}", response_model=UsernameCheckResponse)
def check_username(
    username: str,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Check if a username is available and suggest an alternative if not."""
    slug = slugify_username(username)

    if not slug:
        return UsernameCheckResponse(
            available=False,
            suggestion=None,
        )

    available = is_username_available(slug, db)

    return UsernameCheckResponse(
        available=available,
        suggestion=None if available else get_suggested_username(slug, db),
    )


@router.post("", response_model=UserCreateResponse)
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Create a new user and generate an invite link."""

    # Check if email already exists (only if email is provided)
    if data.email:
        if db.query(User).filter(User.email == data.email).first():
            raise HTTPException(status_code=400, detail="Email already registered")

    # Generate or validate username
    if data.username:
        # Admin provided a custom username
        slug = slugify_username(data.username)
        if not is_username_available(slug, db):
            raise HTTPException(status_code=400, detail="Username already taken")
        username = slug
    else:
        # Auto-generate from firstname
        username = generate_unique_username(data.firstname, db)

    # Create user without password
    user = User(
        firstname=data.firstname,
        lastname=data.lastname,
        email=data.email,
        username=username,
        roles=data.roles,
        password_hash=None,  # Will be set during registration
    )
    db.add(user)
    db.flush()  # Get the user ID

    # Create invite token
    token = secrets.token_urlsafe(32)
    invite = InviteToken(
        user_id=user.id,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=INVITE_TOKEN_EXPIRY_DAYS),
    )
    db.add(invite)
    db.commit()
    db.refresh(user)

    # Build invite URL (frontend will be at /register/{token})
    invite_url = f"/register/{token}"

    return UserCreateResponse(
        user=user_to_out(user),
        invite_url=invite_url,
    )


@router.get("/{user_id}/invite", response_model=dict)
def regenerate_invite(
    user_id: UUID,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Generate a new invite link for an existing user (invalidates previous tokens)."""

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.password_hash is not None:
        raise HTTPException(
            status_code=400, detail="User has already completed registration"
        )

    # Mark all existing tokens as used (invalidate them)
    db.query(InviteToken).filter(
        InviteToken.user_id == user_id,
        InviteToken.used_at.is_(None),
    ).update({"used_at": datetime.now(timezone.utc)})

    # Create new invite token
    token = secrets.token_urlsafe(32)
    invite = InviteToken(
        user_id=user.id,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=INVITE_TOKEN_EXPIRY_DAYS),
    )
    db.add(invite)
    db.commit()

    return {"invite_url": f"/register/{token}"}


@router.post("/{user_id}/reset-password", response_model=dict)
def reset_password(
    user_id: UUID,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Reset a user's password by clearing it and generating a new invite link."""

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.username == PROTECTED_USERNAME:
        raise HTTPException(status_code=403, detail="Cannot modify the main admin account")

    # Clear the password so user must set a new one
    user.password_hash = None

    # Invalidate all existing tokens
    db.query(InviteToken).filter(
        InviteToken.user_id == user_id,
        InviteToken.used_at.is_(None),
    ).update({"used_at": datetime.now(timezone.utc)})

    # Create new invite token
    token = secrets.token_urlsafe(32)
    invite = InviteToken(
        user_id=user.id,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=INVITE_TOKEN_EXPIRY_DAYS),
    )
    db.add(invite)
    db.commit()

    return {"invite_url": f"/register/{token}"}


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: UUID,
    active: bool = Query(None),
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Update user (activate/deactivate)."""

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.username == PROTECTED_USERNAME:
        raise HTTPException(status_code=403, detail="Cannot modify the main admin account")

    if active is not None:
        user.active = active

    db.commit()
    db.refresh(user)

    return user_to_out(user)


@router.patch("/{user_id}/roles", response_model=UserOut)
def update_user_roles(
    user_id: UUID,
    data: UserUpdateRoles,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Update a user's roles (admin only)."""

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.username == PROTECTED_USERNAME:
        raise HTTPException(status_code=403, detail="Cannot modify the main admin account")

    user.roles = data.roles
    db.commit()
    db.refresh(user)

    return user_to_out(user)


@router.delete("/{user_id}")
def delete_user(
    user_id: UUID,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    """Delete a user and their invite tokens."""

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.username == PROTECTED_USERNAME:
        raise HTTPException(status_code=403, detail="Cannot delete the main admin account")

    # Delete invite tokens first (foreign key constraint)
    db.query(InviteToken).filter(InviteToken.user_id == user_id).delete()

    # Delete user
    db.delete(user)
    db.commit()

    return {"message": "User deleted"}


