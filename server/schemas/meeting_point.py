from pydantic import BaseModel
from uuid import UUID
from datetime import date, time, datetime
from typing import Optional
from enum import Enum


class RecurrenceType(str, Enum):
    weekly = "weekly"
    biweekly = "biweekly"
    monthly = "monthly"


class MeetingPointOut(BaseModel):
    id: UUID
    date: date
    time: time
    location: str
    conductor_id: Optional[UUID] = None
    conductor_name: Optional[str] = None
    outline: Optional[str] = None
    link: Optional[str] = None
    month: str
    series_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MeetingPointCreate(BaseModel):
    date: date
    time: time
    location: str
    conductor_id: Optional[UUID] = None
    outline: Optional[str] = None
    link: Optional[str] = None


class MeetingPointSeriesCreate(BaseModel):
    start_date: date
    end_date: date
    recurrence: RecurrenceType
    time: time
    location: str
    conductor_id: Optional[UUID] = None
    outline: Optional[str] = None
    link: Optional[str] = None


class MeetingPointUpdate(BaseModel):
    date: Optional[date] = None
    time: Optional[time] = None
    location: Optional[str] = None
    conductor_id: Optional[UUID] = None
    outline: Optional[str] = None
    link: Optional[str] = None


class ConductorStatsOut(BaseModel):
    user_id: UUID
    firstname: str
    lastname: str
    count: int
    last_date: Optional[date] = None

    class Config:
        from_attributes = True


class MonthlyStatsOut(BaseModel):
    month: str
    user_id: UUID
    firstname: str
    lastname: str
    count: int

    class Config:
        from_attributes = True
