import aiohttp
import os
from datetime import datetime
from typing import Dict, List, Tuple
from uuid import UUID
from main_server.core.dictionir import DeliveryMethodEnum, DeliveryStatusEnum
from main_server.db.models import ReportDeliveryLog
from main_server.db.repositories import UserRepository, S3StorageRepository, ReportRepository
from main_server.db.repositories import ReportDeliveryLogRepository
from main_server.services.email_schedule_send import EmailScheduleSend
from main_server.db.secret_config import secret_settings

class ReportDeliveryService:
    # main_server/services/report_delivery_service.py
    def __init__(self,
                 temp_files_dir: str,
                 email_schedule_send: EmailScheduleSend,
                 user_repository: UserRepository,
                 s3_storage_repository: S3StorageRepository,
                 report_repository: ReportRepository,
                 report_delivery_log_repository: ReportDeliveryLogRepository,
                 tg_bot_api_url: str = secret_settings.TG_BOT_API_URL):
        self.user_repository = user_repository
        self.email_schedule_send = email_schedule_send
        self.s3_storage_repository = s3_storage_repository
        self.report_repository = report_repository
        self.temp_files_dir = temp_files_dir
        self.report_delivery_log_repository = report_delivery_log_repository
        self.tg_bot_api_url = tg_bot_api_url

    async def _send_report_via_telegram(self, report_url: str, chat_ids: List[int], report_name: str):
        """
        Отправляет отчет через Telegram API бота
        """
        async with aiohttp.ClientSession() as session:
            payload = {
                "report_url": report_url,  # Теперь отправляем URL файла в Minio вместо пути
                "chat_ids": chat_ids,
                "report_name": report_name
            }

            async with session.post(self.tg_bot_api_url, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    raise RuntimeError(f"Failed to send report via Telegram: {error_text}")

                return await response.json()



    class ReportDeliveryService:
        # main_server/services/report_delivery_service.py
        def __init__(self,
                     temp_files_dir: str,
                     email_schedule_send: EmailScheduleSend,
                     user_repository: UserRepository,
                     s3_storage_repository: S3StorageRepository,
                     report_repository: ReportRepository,
                     report_delivery_log_repository: ReportDeliveryLogRepository,
                     tg_bot_api_url: str = secret_settings.TG_BOT_API_URL):
            self.user_repository = user_repository
            self.email_schedule_send = email_schedule_send
            self.s3_storage_repository = s3_storage_repository
            self.report_repository = report_repository
            self.temp_files_dir = temp_files_dir
            self.report_delivery_log_repository = report_delivery_log_repository
            self.tg_bot_api_url = tg_bot_api_url

        async def _deliver_telegram_reports(
                self,
                report_id: UUID,
                chat_ids: List[int],
                report_file_path: str,
                db_users: List,
                report_name: str
        ) -> None:
            """
            Отправляет отчет пользователям через Telegram

            Args:
                report_id: ID отчета
                chat_ids: Список chat_id пользователей для отправки
                report_file_path: Путь к файлу отчета
                db_users: Список пользователей из БД
                report_name: Название отчета
            """
            if not chat_ids or not report_file_path:
                return

            telegram_result = await self._send_report_via_telegram(
                report_path=report_file_path,
                chat_ids=chat_ids,
                report_name=report_name
            )

            # Логируем результаты отправки
            for result in telegram_result.get("results", []):
                try:
                    status = DeliveryStatusEnum.SENT if result.get("status") == "sent" else DeliveryStatusEnum.FAILED
                    error_message = result.get("error") if status == DeliveryStatusEnum.FAILED else None
                    chat_id = str(result.get("chat_id"))
                    recipient_id = next((user.id for user in db_users if user.chat_id == chat_id), None)

                    if recipient_id:
                        await self.report_delivery_log_repository.create_log(
                            recipient_id=recipient_id,
                            report_id=report_id,
                            method=DeliveryMethodEnum.TELEGRAM,
                            status=status,
                            error_message=error_message
                        )
                except Exception as e:
                    print(f"Ошибка при логировании отправки через Telegram: {str(e)}")

        async def _send_report_via_telegram(self, report_path: str, chat_ids: List[int], report_name: str) -> Dict:
            """
            Отправляет отчет через Telegram API бота
            """
            async with aiohttp.ClientSession() as session:
                payload = {
                    "report_path": report_path,
                    "chat_ids": chat_ids,
                    "report_name": report_name
                }

                async with session.post(self.tg_bot_api_url, json=payload) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise RuntimeError(f"Failed to send report via Telegram: {error_text}")

                    return await response.json()

        async def send_report(
                self,
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
                        delivery_groups[method].append((user.email, user.id))
                    elif method == DeliveryMethodEnum.TELEGRAM and user.chat_id:
                        delivery_groups[method].append(user.chat_id)
                    elif method == DeliveryMethodEnum.PLATFORM:
                        delivery_groups[method].append(user.id)

            # Отправляем отчет по электронной почте
            if delivery_groups[DeliveryMethodEnum.EMAIL]:
                await self.email_schedule_send.schedule_mass_report(
                    delivery_groups[DeliveryMethodEnum.EMAIL],
                    report_id,
                    "отчет",
                    "отчет",
                    attachments=[report_file_path],
                    delay_seconds=0
                )

            # Отправляем отчет через Telegram

            if delivery_groups[DeliveryMethodEnum.TELEGRAM] and report and report_file_path:
                report_name = report.name if hasattr(report, "name") else f"Отчет #{report_id}"
                await self._deliver_telegram_reports(
                    report_id=report_id,
                    chat_ids=delivery_groups[DeliveryMethodEnum.TELEGRAM],
                    report_file_path=report_file_path,
                    db_users=db_users,
                    report_name=report_name
                )

            await self._send_messages_platform(delivery_groups[DeliveryMethodEnum.PLATFORM], report_id)

        async def _send_messages_platform(self, user_ids: List[UUID], report_id: UUID):
            await self.report_delivery_log_repository.bulk_create_logs(
                recipient_ids=user_ids,
                report_id=report_id,
                method=DeliveryMethodEnum.PLATFORM,
                status=DeliveryStatusEnum.SENT)

        async def get_user_delivery_logs(
                self,
                user_id: UUID,
                page: int = 1,
                per_page: int = 10
        ) -> Tuple[List[ReportDeliveryLog], dict]:
            if page < 1:
                page = 1
            offset = (page - 1) * per_page

            logs = await self.report_delivery_log_repository.get_user_logs_paginated(
                user_id=user_id,
                offset=offset,
                limit=per_page
            )
            total_count = await self.report_delivery_log_repository.get_user_logs_count(user_id)
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

        async def get_user_received_reports(
                self,
                user_id: UUID,
                page: int = 1,
                per_page: int = 10
        ) -> Tuple[List[Dict], Dict]:
            """
            Получить информацию о доставленных пользователю отчетах

            Args:
                user_id: ID пользователя
                page: Номер страницы
                per_page: Количество записей на страницу

            Returns:
                Список отчетов и информация о пагинации
            """
            reports_list, total_count = await self.report_delivery_log_repository.get_user_received_reports_paginated(
                user_id=user_id,
                page=page,
                per_page=per_page
            )

            # Данные пагинации
            total_pages = (total_count + per_page - 1) // per_page
            pagination_data = {
                "total": total_count,
                "page": page,
                "per_page": per_page,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1
            }

            return reports_list, pagination_data

    async def send_report(
            self,
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
                    delivery_groups[method].append((user.email,user.id))
                elif method == DeliveryMethodEnum.TELEGRAM and user.chat_id:
                    delivery_groups[method].append(user.chat_id)
                elif method == DeliveryMethodEnum.PLATFORM:
                    delivery_groups[method].append(user.id)

        # Отправляем отчет по электронной почте
        if delivery_groups[DeliveryMethodEnum.EMAIL]:
            await self.email_schedule_send.schedule_mass_report(
                delivery_groups[DeliveryMethodEnum.EMAIL],
                report_id,
                "отчет",
                "отчет",
                attachments=[report_file_path],
                delay_seconds=0
            )

        # Отправляем отчет через Telegram
        if delivery_groups[DeliveryMethodEnum.TELEGRAM] and report and report_file_path:
            relative_path = report_file_path

            telegram_result = await self._send_report_via_telegram(
                report_url=report.report_url,  # URL файла вместо локального пути
                chat_ids=delivery_groups[DeliveryMethodEnum.TELEGRAM],
                report_name=report.name if hasattr(report, "name") else f"Отчет #{report_id}"
            )

            # Логируем результаты отправки
            for result in telegram_result.get("results", []):
                try:
                    status = DeliveryStatusEnum.SENT if result.get("status") == "sent" else DeliveryStatusEnum.FAILED
                    error_message = result.get("error") if status == DeliveryStatusEnum.FAILED else None
                    chat_id = str(result.get("chat_id"))
                    recipient_id = next((user.id for user in db_users if user.chat_id == chat_id), None)

                    if recipient_id:
                        await self.report_delivery_log_repository.create_log(
                            recipient_id=recipient_id,
                            report_id=report_id,
                            method=DeliveryMethodEnum.TELEGRAM,
                            status=status,
                            error_message=error_message
                        )
                except Exception as e:
                    # Для логирования ошибки нужен recipient_id, но в случае ошибки поиска лучше просто записать это в лог
                    print(f"Ошибка при логировании отправки через Telegram: {str(e)}")

        await self._send_messages_platform(delivery_groups[DeliveryMethodEnum.PLATFORM], report_id)

    async def _send_messages_platform(self, user_ids: List[UUID], report_id: UUID):
        await self.report_delivery_log_repository.bulk_create_logs(
            recipient_ids= user_ids,
            report_id= report_id,
            method= DeliveryMethodEnum.PLATFORM,
            status= DeliveryStatusEnum.SENT)

    async def get_user_delivery_logs(
            self,
            user_id: UUID,
            page: int = 1,
            per_page: int = 10
    ) -> Tuple[List[ReportDeliveryLog], dict]:
        if page < 1:
            page = 1
        offset = (page - 1) * per_page

        logs = await self.report_delivery_log_repository.get_user_logs_paginated(
            user_id=user_id,
            offset=offset,
            limit=per_page
        )
        total_count = await self.report_delivery_log_repository.get_user_logs_count(user_id)
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

    async def get_user_received_reports(
            self,
            user_id: UUID,
            page: int = 1,
            per_page: int = 10
    ) -> Tuple[List[Dict], Dict]:
        """
        Получить информацию о доставленных пользователю отчетах

        Args:
            user_id: ID пользователя
            page: Номер страницы
            per_page: Количество записей на страницу

        Returns:
            Список отчетов и информация о пагинации
        """
        reports_list, total_count = await self.report_delivery_log_repository.get_user_received_reports_paginated(
            user_id=user_id,
            page=page,
            per_page=per_page
        )

        # Данные пагинации
        total_pages = (total_count + per_page - 1) // per_page
        pagination_data = {
            "total": total_count,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }

        return reports_list, pagination_data
