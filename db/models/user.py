from sqlalchemy import Column, Integer, String, DateTime, Index, JSON, Text
from .base import Base
from core.dictionir.ROLE import UserRoles

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    telegram_id = Column(String, unique=True, nullable=False)
    full_name = Column(String)
    email = Column(String, nullable=True)
    password_hash = Column(String, nullable=True)
    user_type = Column(String, default=UserRoles.USER)
    is_active = Column(Integer, default=1)




