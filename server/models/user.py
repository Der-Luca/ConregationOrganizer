import uuid
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.sql import func

from db.base import Base


VALID_ROLES = {"publisher", "cartplanner", "fieldserviceplanner", "admin"}


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    firstname = Column(String, nullable=False)
    lastname = Column(String, nullable=False)

    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=True, index=True)  # Optional

    password_hash = Column(String, nullable=True)  # Nullable for invited users

    roles = Column(ARRAY(String), nullable=False, default=["publisher"])
    active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
