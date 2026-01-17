from pydantic import BaseModel
from uuid import UUID
from datetime import datetime

class UserOut(BaseModel):
    id: UUID
    firstname: str
    lastname: str
    email: str
    role: str
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True
