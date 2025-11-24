import uuid
from typing import Optional, List
from uuid import uuid4
from datetime import datetime
from fastapi import HTTPException
from main_server.db.models import GeneratedReport
from main_server.db.repositories import ReportRepository, S3StorageRepository

class ReportService:
    def __init__(
            self,
            storage_repo: S3StorageRepository,
            report_repo: ReportRepository
    ):
        self._storage = storage_repo
        self._repo = report_repo

    async def generate_report(
            self,
            file: bytes,
            report_name: str,
            set_report_name : str,
            user_id: uuid4
    ) -> GeneratedReport:
        """Upload report file to MinIO and save metadata to database"""
        try:
            upload_id = str(uuid4())
            date_prefix = datetime.now().strftime("%Y/%m/%d")

            # Получаем расширение файла из оригинального имени
            file_extension = report_name.split('.')[-1] if '.' in report_name else ''

            # Формируем путь с оригинальным расширением
            report_path = f"reports/{date_prefix}/{upload_id}/report.{file_extension}" if file_extension else f"reports/{date_prefix}/{upload_id}/report"

            await self._storage.upload_file(file, report_path)

            # Save report metadata to database
            return await self._repo.create_report(
                report_name=set_report_name,
                report_url=report_path,
                user_id=user_id
            )

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Report upload failed: {str(e)}"
            )

    async def get_user_reports(
            self,
            user_id: uuid.UUID,
            date_from: Optional[datetime] = None,
            date_to: Optional[datetime] = None
    ) -> List[GeneratedReport]:
        """
        Получает все отчеты, сгенерированные указанным пользователем

        Args:
            user_id: UUID пользователя
            date_from: Начальная дата для фильтрации (опционально)
            date_to: Конечная дата для фильтрации (опционально)

        Returns:
            Список объектов GeneratedReport

        Raises:
            HTTPException: Если произошла ошибка при получении отчетов
        """
        try:
            return await self._repo.get_reports_by_user_id(
                user_id=user_id,
                date_from=date_from,
                date_to=date_to
            )
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to get user reports: {str(e)}"
            )
