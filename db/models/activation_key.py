from sqlalchemy import Column, String, Integer, DateTime, ForeignKey

from db.models.base import Base


class ActivationKey(Base):
    __tablename__ = 'activation_keys'

    key = Column(String(8), primary_key=True, unique=True, nullable=False)

    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)

    expires_at = Column(DateTime(timezone=True), nullable=False)