from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class BookingCreate(BaseModel):
    cart_id: UUID
    user_id: UUID
    start_datetime: datetime
    end_datetime: datetime

class BookingOut(BaseModel):
    id: UUID
    cart_id: UUID
    user_id: UUID
    start_datetime: datetime
    end_datetime: datetime

    class Config:
        from_attributes = True
