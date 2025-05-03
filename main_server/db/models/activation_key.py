from sqlalchemy import Column, String, DateTime, ForeignKey, UUID

from main_server.db.models.base import Base


class ActivationKey(Base):
    __tablename__ = 'activation_keys'

    key = Column(String(10), primary_key=True, unique=True, nullable=False)

    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)

    expires_at = Column(DateTime(timezone=True), nullable=False)