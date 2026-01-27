from pydantic import BaseModel, EmailStr, field_validator
from uuid import UUID
from datetime import datetime
from typing import Optional


class UserOut(BaseModel):
    id: UUID
    firstname: str
    lastname: str
    username: str
    email: Optional[str] = None
    role: str
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
    role: str = "user"

    @field_validator("role")
    @classmethod
    def validate_role(cls, v):
        if v not in ("user", "admin"):
            raise ValueError("Role must be 'user' or 'admin'")
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
