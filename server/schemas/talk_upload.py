from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List


class TalkLinkCreate(BaseModel):
    title: Optional[str] = None
    password: Optional[str] = None
    expires_at: Optional[datetime] = None


class TalkLinkUpdate(BaseModel):
    title: Optional[str] = None
    password: Optional[str] = None
    expires_at: Optional[datetime] = None
    active: Optional[bool] = None


class TalkLinkOut(BaseModel):
    id: UUID
    token: str
    title: Optional[str] = None
    expires_at: Optional[datetime] = None
    has_password: bool
    max_total_bytes: int
    total_bytes: int
    file_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class TalkFileOut(BaseModel):
    id: UUID
    original_filename: str
    size_bytes: int
    uploaded_at: datetime

    class Config:
        from_attributes = True


class TalkLinkWithFilesOut(TalkLinkOut):
    files: List[TalkFileOut]


class TalkLinkPublicOut(BaseModel):
    title: Optional[str] = None
    expires_at: Optional[datetime] = None
    has_password: bool
    max_total_bytes: int
    total_bytes: int
    file_count: int
