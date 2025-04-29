from sqlalchemy import Column, Integer, String, DateTime,Index
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime

class Base(DeclarativeBase): pass

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    telegram_id = Column(String, unique=True, nullable=False)
    full_name = Column(String)
    is_active = Column(Integer, default=1)  # 1 - если пользователь активен

    def __repr__(self):
        return f"<User(id={self.id}, telegram_id={self.telegram_id}, full_name={self.full_name})>"



class GeneratedReport(Base):
    __tablename__ = 'generated_reports'

    __table_args__ = (
        Index('ix_generated_at', 'generated_at'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_name = Column(String(255))
    report_url = Column(String(512))
    excel_url = Column(String(512))
    template_url = Column(String(512))
    generated_at = Column(DateTime, default=datetime.utcnow)