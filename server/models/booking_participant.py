import uuid
from sqlalchemy import Column, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from db.base import Base


class BookingParticipant(Base):
    """Many-to-many relationship between bookings and users"""
    __tablename__ = "booking_participants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    booking_id = Column(UUID(as_uuid=True), ForeignKey("cart_bookings.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
