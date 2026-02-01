import uuid
from sqlalchemy import Column, String, Date, Time, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from db.base import Base


class MeetingPoint(Base):
    __tablename__ = "meeting_points"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    date = Column(Date, nullable=False)
    time = Column(Time, nullable=False)
    location = Column(String, nullable=False)
    conductor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    outline = Column(String, nullable=True)
    link = Column(String, nullable=True)
    month = Column(String, nullable=False)  # "YYYY-MM"
    series_id = Column(UUID(as_uuid=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    conductor = relationship("User", foreign_keys=[conductor_id], lazy="joined")

    __table_args__ = (
        Index("ix_meeting_points_month", "month"),
        Index("ix_meeting_points_series_id", "series_id"),
    )
