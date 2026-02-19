from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class AbsenceCreate(BaseModel):
    start_datetime: datetime
    end_datetime: datetime
    reason: Optional[str] = None


class AbsenceOut(BaseModel):
    id: UUID
    user_id: UUID
    start_datetime: datetime
    end_datetime: datetime
    reason: Optional[str] = None
    user_name: Optional[str] = None

    class Config:
        from_attributes = True
