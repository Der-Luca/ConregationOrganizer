from pydantic import BaseModel, field_validator
from datetime import date, time, datetime
from uuid import UUID
from typing import Optional


class AssignmentInput(BaseModel):
    user_id: UUID
    is_captain: bool = False


class CartSessionCreate(BaseModel):
    cart_id: UUID
    date: date
    start_time: time
    end_time: time
    assignments: list[AssignmentInput] = []

    @field_validator("end_time")
    @classmethod
    def end_after_start(cls, v, info):
        if "start_time" in info.data and v <= info.data["start_time"]:
            raise ValueError("end_time must be after start_time")
        return v

    @field_validator("assignments")
    @classmethod
    def max_assignments(cls, v):
        if len(v) > 4:
            raise ValueError("Maximum 4 assignments per session")
        return v


class CartSessionUpdate(BaseModel):
    date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None


class CartAssignmentOut(BaseModel):
    id: UUID
    user_id: UUID
    firstname: str
    lastname: str
    gender: Optional[str] = None
    is_captain: bool
    status: str
    responded_at: Optional[datetime] = None


class CartSessionOut(BaseModel):
    id: UUID
    cart_id: UUID
    cart_name: str
    date: date
    start_time: time
    end_time: time
    month: str
    assignments: list[CartAssignmentOut] = []
    created_at: datetime
    updated_at: Optional[datetime] = None


class AssignmentRespondRequest(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v not in ("accepted", "declined"):
            raise ValueError("Status must be 'accepted' or 'declined'")
        return v


class CartStatsOut(BaseModel):
    user_id: UUID
    firstname: str
    lastname: str
    gender: Optional[str] = None
    count: int
    last_date: Optional[date] = None
