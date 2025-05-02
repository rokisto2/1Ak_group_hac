from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from typing import List, Optional
from db.models import generated_report
from db.models.generated_report import GeneratedReport


class ReportRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def create_report(
            self,
            report_name: str,
            report_url: str,
            excel_url: str,
            template_url: str,
            user_id: uuid4
    ) -> GeneratedReport:
        report = GeneratedReport(
            report_name=report_name,
            report_url=report_url,
            excel_url=excel_url,
            template_url=template_url,
            user_id=user_id,
        )
        self._session.add(report)
        await self._session.commit()
        await self._session.refresh(report)
        return report

    async def get_reports_by_user_id(
            self,
            user_id: uuid4,
            date_from: Optional[datetime] = None,
            date_to: Optional[datetime] = None
    ) -> List[GeneratedReport]:
        """
        Получает все отчеты, сгенерированные указанным пользователем.

        Args:
            user_id: UUID пользователя, чьи отчеты нужно найти
            date_from: Опциональная начальная дата для фильтрации
            date_to: Опциональная конечная дата для фильтрации

        Returns:
            Список объектов GeneratedReport или пустой список, если отчеты не найдены
        """
        query = select(GeneratedReport).where(GeneratedReport.user_id == user_id)

        if date_from:
            query = query.where(GeneratedReport.generated_at >= date_from)
        if date_to:
            query = query.where(GeneratedReport.generated_at <= date_to)

        result = await self._session.execute(
            query.order_by(GeneratedReport.generated_at.desc())
        )
        return result.scalars().all()

    async def get_report_by_id(self, report_id: uuid4) -> Optional[GeneratedReport]:
        """
        Получает отчет по его ID.

        Args:
            report_id: UUID отчета, который нужно найти

        Returns:
            Найденный объект GeneratedReport или None, если отчет не найден
        """
        result = await self._session.execute(
            select(GeneratedReport)
            .where(GeneratedReport.id == report_id)
        )
        return result.scalar_one_or_none()