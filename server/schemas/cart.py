from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class CartCreate(BaseModel):
    name: str
    location: str | None = None

class CartUpdate(BaseModel):
    name: str
    location: str | None = None

class CartOut(BaseModel):
    id: UUID
    name: str
    location: str | None
    active: bool

    class Config:
        from_attributes = True
