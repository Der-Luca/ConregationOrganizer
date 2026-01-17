from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class CartCreate(BaseModel):
    name: str
    location: str | None = None

class CartOut(BaseModel):
    id: UUID
    name: str
    location: str | None
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True
