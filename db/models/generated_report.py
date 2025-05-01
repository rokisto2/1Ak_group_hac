import uuid
from datetime import datetime

from sqlalchemy import Column, String, DateTime, UUID, ForeignKey
from sqlalchemy.orm import relationship

from .base import Base

class GeneratedReport(Base):
    __tablename__ = 'generated_reports'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    report_name = Column(String(255))
    report_url = Column(String(512))
    excel_url = Column(String(512))
    template_url = Column(String(512))
    generated_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="reports")
    delivery_logs = relationship("ReportDeliveryLog", back_populates="report")