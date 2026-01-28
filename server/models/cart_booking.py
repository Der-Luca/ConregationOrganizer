import uuid
from sqlalchemy import Column, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from db.base import Base


class CartBooking(Base):
    __tablename__ = "cart_bookings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    cart_id = Column(UUID(as_uuid=True), ForeignKey("carts.id"), nullable=False)
    # DEPRECATED: user_id wird durch participants ersetzt
    # Bleibt vorerst für Migration, wird später entfernt
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    start_datetime = Column(DateTime(timezone=True), nullable=False)
    end_datetime = Column(DateTime(timezone=True), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    cart = relationship("Cart")
    participants = relationship(
        "User",
        secondary="booking_participants",
        backref="bookings"
    )
