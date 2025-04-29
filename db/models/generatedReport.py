import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, Index, UUID
from .base import Base

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