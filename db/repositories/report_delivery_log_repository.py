from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession
from db.models.report_delivery_log import ReportDeliveryLog
from db.enums import DeliveryMethodEnum, DeliveryStatusEnum

class ReportDeliveryLogRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_log(self, *, user_id: uuid4, report_id: uuid4, method: DeliveryMethodEnum, status: DeliveryStatusEnum, error_message=None) -> ReportDeliveryLog:
        log = ReportDeliveryLog(
            user_id=user_id,
            report_id=report_id,
            delivery_method=method,
            status=status,
            error_message=error_message
        )
        self.session.add(log)
        await self.session.flush()  # чтобы получить log.id, если нужно
        return log

    async def update_status(self, log_id: uuid4, status: DeliveryStatusEnum, error_message=None) -> ReportDeliveryLog | None:
        log = await self.session.get(ReportDeliveryLog, log_id)
        if log:
            log.status = status
            log.error_message = error_message
            await self.session.flush()
        return log
