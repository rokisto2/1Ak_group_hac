from typing import List, Tuple, Dict
from uuid import uuid4, UUID

from sqlalchemy import func, select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import GeneratedReport, User
from db.models.report_delivery_log import ReportDeliveryLog
from db.enums import DeliveryMethodEnum, DeliveryStatusEnum

class ReportDeliveryLogRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_log(self, *, recipient_id: uuid4, report_id: uuid4, method: DeliveryMethodEnum, status: DeliveryStatusEnum, error_message=None) -> ReportDeliveryLog:
        log = ReportDeliveryLog(
            user_id=recipient_id,
            report_id=report_id,
            delivery_method=method,
            status=status,
            error_message=error_message
        )
        self.session.add(log)
        await self.session.flush()  # чтобы получить log.id, если нужно
        return log

    async def bulk_create_logs(
            self,
            *,
            recipient_ids: List[UUID],
            report_id: UUID,
            method: DeliveryMethodEnum,
            status: DeliveryStatusEnum,
            error_message: str = None
    ) -> List[ReportDeliveryLog]:
        logs = [
            ReportDeliveryLog(
                user_id=user_id,
                report_id=report_id,
                delivery_method=method,
                status=status,
                error_message=error_message
            )
            for user_id in recipient_ids
        ]

        self.session.add_all(logs)
        await self.session.commit()
        await self.session.flush()

        return logs

    async def update_status(self, log_id: uuid4, status: DeliveryStatusEnum, error_message=None) -> ReportDeliveryLog | None:
        log = await self.session.get(ReportDeliveryLog, log_id)
        if log:
            log.status = status
            log.error_message = error_message
            await self.session.flush()
        return log


    async def get_user_logs_count(self, user_id: UUID) -> int:
        """Получить общее количество логов для пользователя"""
        result = await self.session.execute(
            select(func.count())
            .where(ReportDeliveryLog.user_id == user_id)
        )
        return result.scalar_one()

    async def get_user_logs_paginated(
        self,
        user_id: UUID,
        offset: int,
        limit: int
    ) -> List[ReportDeliveryLog]:
        """Получить логи с пагинацией (только данные)"""
        result = await self.session.execute(
            select(ReportDeliveryLog)
            .where(ReportDeliveryLog.user_id == user_id)
            .order_by(desc(ReportDeliveryLog.delivered_at))
            .offset(offset)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_user_received_reports_paginated(
            self,
            user_id: UUID,
            page: int = 1,
            per_page: int = 10
    ) -> Tuple[List[Dict], int]:
        """
        Получить информацию о доставленных отчетах пользователю с пагинацией,
        каждая запись возвращается индивидуально

        Args:
            user_id: ID пользователя-получателя
            page: Номер страницы
            per_page: Количество записей на страницу
        """
        if page < 1:
            page = 1
        offset = (page - 1) * per_page

        # Запрос для получения детальной информации о каждой записи доставки
        stmt = (
            select(
                ReportDeliveryLog.delivery_method.label("delivery_method"),
                ReportDeliveryLog.delivered_at.label("delivered_at"),
                GeneratedReport.report_name.label("report_name"),
                GeneratedReport.report_url.label("report_url"),
                User.full_name.label("sender_name")
            )
            .join(
                GeneratedReport,
                ReportDeliveryLog.report_id == GeneratedReport.id
            )
            .join(
                User,
                GeneratedReport.user_id == User.id
            )
            .where(
                ReportDeliveryLog.user_id == user_id,
                ReportDeliveryLog.status == DeliveryStatusEnum.SENT
            )
            .order_by(desc(ReportDeliveryLog.delivered_at))
        )

        # Получаем общее количество записей
        count_stmt = (
            select(func.count())
            .select_from(stmt.subquery())
        )

        total_count_result = await self.session.execute(count_stmt)
        total_count = total_count_result.scalar_one()

        # Применяем пагинацию
        paginated_stmt = stmt.offset(offset).limit(per_page)
        result = await self.session.execute(paginated_stmt)

        # Получаем результаты как список словарей
        rows = result.all()
        reports_list = [
            {
                "report_name": row.report_name,
                "report_url": row.report_url,
                "sender_name": row.sender_name,
                "delivered_at": row.delivered_at,
                "delivery_method": row.delivery_method
            }
            for row in rows
        ]

        return reports_list, total_count