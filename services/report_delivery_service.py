import os
from datetime import datetime
from typing import Dict, List, Tuple
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from db.enums import DeliveryMethodEnum, DeliveryStatusEnum
from db.models import ReportDeliveryLog
from db.repositories import UserRepository, S3StorageRepository, ReportRepository
from db.repositories.report_delivery_log_repository import ReportDeliveryLogRepository
from services.email_schedule_send import EmailScheduleSend


class ReportDeliveryService:
    def __init__(self,
                 temp_files_dir: str,
                 email_schedule_send: EmailScheduleSend,
                 user_repository: UserRepository,
                 s3_storage_repository: S3StorageRepository,
                 report_repository: ReportRepository,
                 log_repository: ReportDeliveryLogRepository):
        self.user_repository = user_repository
        self.email_schedule_send = email_schedule_send
        self.s3_storage_repository = s3_storage_repository
        self.report_repository = report_repository
        self.temp_files_dir = temp_files_dir
        self.log_repository = log_repository

    async def send_report(
            self,
            sender_id: UUID,
            report_id: UUID,
            users_info: List[Tuple[UUID, List[DeliveryMethodEnum]]]
    ):
        """
        Отправляет отчет пользователям указанными способами.
        Args:
            sender_id: ID отправителя
            report_id: ID отчета
            users_info: Список кортежей (user_id, delivery_methods)
                        где delivery_methods - список методов доставки
        """
        user_ids = [user_info[0] for user_info in users_info]
        db_users = await self.user_repository.get_users_by_ids(user_ids)

        delivery_groups = {
            DeliveryMethodEnum.EMAIL: [],
            DeliveryMethodEnum.TELEGRAM: [],
            DeliveryMethodEnum.PLATFORM: []
        }

        report = await self.report_repository.get_report_by_id(report_id)
        report_file_path = ""
        if report:
            # Создаем уникальную директорию для этой рассылки
            date_prefix = datetime.now().strftime("%Y%m%d")
            report_dir = os.path.join(self.temp_files_dir, f"{date_prefix}_{report_id}")
            os.makedirs(report_dir, exist_ok=True)

            # Скачиваем файл отчета из S3
            file_name = os.path.basename(report.report_url)
            report_file_path = os.path.join(report_dir, file_name)

            if not os.path.exists(report_file_path):
                try:
                    file_data = await self.s3_storage_repository.download_file(report.report_url)
                    with open(report_file_path, "wb") as f:
                        f.write(file_data.getvalue())
                except Exception as e:
                    raise RuntimeError(f"Failed to download report file: {str(e)}")

        for user_info in users_info:
            user_id, methods = user_info
            user = next((u for u in db_users if u.id == user_id), None)

            if not user:
                continue

            for method in methods:
                if method == DeliveryMethodEnum.EMAIL and user.email:
                    delivery_groups[method].append(user.email)
                elif method == DeliveryMethodEnum.TELEGRAM and user.chat_id:
                    delivery_groups[method].append(user.chat_id)
                elif method == DeliveryMethodEnum.PLATFORM:
                    delivery_groups[method].append(user.id)

        await self.email_schedule_send.schedule_mass_report(delivery_groups[DeliveryMethodEnum.EMAIL], sender_id,
                                                            report_id, "отчет", "отчет", attachments=[report_file_path],
                                                            delay_seconds=0)

    async def get_user_delivery_logs(
            self,
            user_id: UUID,
            page: int = 1,
            per_page: int = 10
    ) -> Tuple[List[ReportDeliveryLog], dict]:
        """Возвращает логи и сырые данные для пагинации"""
        if page < 1:
            page = 1
        offset = (page - 1) * per_page

        logs = await self.log_repository.get_user_logs_paginated(
            user_id=user_id,
            offset=offset,
            limit=per_page
        )
        total_count = await self.log_repository.get_user_logs_count(user_id)
        total_pages = (total_count + per_page - 1) // per_page

        pagination_data = {
            "total": total_count,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }

        return logs, pagination_data
