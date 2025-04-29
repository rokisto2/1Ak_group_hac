from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from typing import List, Optional
from db.models import GeneratedReport


class ReportRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def create_report(
            self,
            report_name: str,
            report_url: str,
            excel_url: str,
            template_url: str,
    ) -> GeneratedReport:
        report = GeneratedReport(
            report_name=report_name,
            report_url=report_url,
            excel_url=excel_url,
            template_url=template_url,
        )
        self._session.add(report)
        await self._session.commit()
        await self._session.refresh(report)
        return report

    async def list_reports(
            self,
            date_from: Optional[datetime] = None,
            date_to: Optional[datetime] = None
    ) -> List[GeneratedReport]:
        query = select(GeneratedReport)

        if date_from:
            query = query.where(GeneratedReport.generated_at >= date_from)
        if date_to:
            query = query.where(GeneratedReport.generated_at <= date_to)

        result = await self._session.execute(
            query.order_by(GeneratedReport.generated_at.desc())
        )
        return result.scalars().all()