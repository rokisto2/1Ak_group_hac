import uuid
from datetime import datetime, timedelta

from sqlalchemy import Enum as SqlEnum
from sqlalchemy.orm import relationship

from main_server.core.dictionir import DeliveryStatusEnum, DeliveryMethodEnum
from main_server.db.models.base import Base
from sqlalchemy import Column, String, DateTime, UUID, ForeignKey


class ReportDeliveryLog(Base):
    __tablename__ = 'report_delivery_log'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    report_id = Column(UUID(as_uuid=True), ForeignKey('generated_reports.id'), nullable=False)
    delivery_method = Column(SqlEnum(DeliveryMethodEnum, native_enum=False), nullable=False)
    delivered_at = Column(DateTime, default=lambda: datetime.utcnow() + timedelta(hours=3))
    status = Column(SqlEnum(DeliveryStatusEnum, native_enum=False), default=DeliveryStatusEnum.SENT, nullable=False)
    error_message = Column(String, nullable=True)

    user = relationship("User")
    report = relationship("GeneratedReport")
