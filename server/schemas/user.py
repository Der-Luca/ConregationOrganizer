from pydantic import BaseModel, EmailStr, field_validator
from uuid import UUID
from datetime import datetime
from typing import Optional

from models.user import VALID_ROLES


class UserOut(BaseModel):
    id: UUID
    firstname: str
    lastname: str
    username: str
    email: Optional[str] = None
    roles: list[str]
    active: bool
    created_at: datetime
    has_password: bool = False  # Indicates if user has completed registration

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    firstname: str
    lastname: str
    email: Optional[EmailStr] = None  # Optional
    username: Optional[str] = None  # Auto-generated if not provided
    roles: list[str] = ["publisher"]

    @field_validator("roles")
    @classmethod
    def validate_roles(cls, v):
        for role in v:
            if role not in VALID_ROLES:
                raise ValueError(f"Invalid role: {role}. Must be one of {sorted(VALID_ROLES)}")
        return v


class UserUpdateRoles(BaseModel):
    roles: list[str]

    @field_validator("roles")
    @classmethod
    def validate_roles(cls, v):
        if not v:
            raise ValueError("At least one role is required")
        for role in v:
            if role not in VALID_ROLES:
                raise ValueError(f"Invalid role: {role}. Must be one of {sorted(VALID_ROLES)}")
        return v


class UserCreateResponse(BaseModel):
    user: UserOut
    invite_url: str


class RegisterRequest(BaseModel):
    password: str
    password_confirm: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @field_validator("password_confirm")
    @classmethod
    def passwords_match(cls, v, info):
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v


class TokenValidationResponse(BaseModel):
    valid: bool
    user_firstname: Optional[str] = None
    expires_at: Optional[datetime] = None
    error: Optional[str] = None


class UsernameCheckResponse(BaseModel):
    available: bool
    suggestion: Optional[str] = None
