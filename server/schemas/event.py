from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class EventCreate(BaseModel):
    name: str
    description: str | None = None
    start_datetime: datetime
    end_datetime: datetime

class EventOut(BaseModel):
    id: UUID
    name: str
    description: str | None
    start_datetime: datetime
    end_datetime: datetime
    created_at: datetime

    class Config:
        from_attributes = True
