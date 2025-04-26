from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase): pass

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    telegram_id = Column(String, unique=True, nullable=False)
    full_name = Column(String)
    is_active = Column(Integer, default=1)  # 1 - если пользователь активен

    def __repr__(self):
        return f"<User(id={self.id}, telegram_id={self.telegram_id}, full_name={self.full_name})>"