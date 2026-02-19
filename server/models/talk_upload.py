import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, BigInteger, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from db.base import Base


class TalkUploadLink(Base):
    __tablename__ = "talk_upload_links"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token = Column(String, unique=True, nullable=False, index=True)
    title = Column(String, nullable=True)
    password_hash = Column(String, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    max_total_bytes = Column(BigInteger, nullable=False, default=2147483648)  # 2GB
    active = Column(Boolean, default=True)
    upload_token = Column(String, nullable=True)
    upload_token_expires_at = Column(DateTime(timezone=True), nullable=True)

    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    files = relationship(
        "TalkUploadFile",
        back_populates="link",
        cascade="all, delete-orphan",
    )


class TalkUploadFile(Base):
    __tablename__ = "talk_upload_files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    link_id = Column(UUID(as_uuid=True), ForeignKey("talk_upload_links.id"), nullable=False, index=True)
    original_filename = Column(String, nullable=False)
    stored_filename = Column(String, nullable=False)
    size_bytes = Column(BigInteger, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    link = relationship("TalkUploadLink", back_populates="files")
