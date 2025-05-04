import uuid
from sqlalchemy import Column, String, UUID, Boolean
from sqlalchemy.orm import relationship

from .base import Base
from main_server.core import UserRoles

class User(Base):
    __tablename__ = 'users'


    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chat_id = Column(String, unique=True, nullable=True)  # Может быть null
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    user_type = Column(String, default=UserRoles.USER)
    is_banned = Column(Boolean, default=False)

    reports = relationship("GeneratedReport", back_populates="user")
    delivery_logs = relationship("ReportDeliveryLog", back_populates="user")