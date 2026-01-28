from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from uuid import UUID


class BookingCreate(BaseModel):
    cart_id: UUID
    participant_ids: list[UUID] = Field(..., min_length=1, max_length=2)
    start_datetime: datetime
    end_datetime: datetime
    
    @field_validator('end_datetime')
    @classmethod
    def end_after_start(cls, v, info):
        if 'start_datetime' in info.data and v <= info.data['start_datetime']:
            raise ValueError('end_datetime must be after start_datetime')
        return v


class ParticipantOut(BaseModel):
    id: UUID
    firstname: str
    lastname: str
    email: str
    
    class Config:
        from_attributes = True


class BookingOut(BaseModel):
    id: UUID
    cart_id: UUID
    participants: list[ParticipantOut]
    start_datetime: datetime
    end_datetime: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True


class CalendarBookingOut(BaseModel):
    """Simplified booking output for calendar views"""
    id: UUID
    cart_id: UUID
    cart_name: str
    participant_names: list[str]
    start_datetime: datetime
    end_datetime: datetime
    
    class Config:
        from_attributes = True
