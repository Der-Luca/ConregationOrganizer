import uuid
from sqlalchemy import Column, String, Date, Time, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from db.base import Base


class CartSession(Base):
    __tablename__ = "cart_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    cart_id = Column(UUID(as_uuid=True), ForeignKey("carts.id"), nullable=False)
    date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    month = Column(String, nullable=False)  # "YYYY-MM" for easy filtering

    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    cart = relationship("Cart")
    creator = relationship("User", foreign_keys=[created_by])
    assignments = relationship("CartAssignment", back_populates="session", cascade="all, delete-orphan")
