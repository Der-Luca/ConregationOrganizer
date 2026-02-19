from pydantic import BaseModel
from uuid import UUID
from datetime import date
from typing import Optional


class UserStatsOut(BaseModel):
    user_id: UUID
    firstname: str
    lastname: str
    meeting_points_count: int
    meeting_points_last_date: Optional[date] = None
    cart_sessions_count: int
    cart_sessions_last_date: Optional[date] = None

    class Config:
        from_attributes = True
