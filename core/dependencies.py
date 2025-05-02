from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator
import aioboto3
from botocore.client import BaseClient
from fastapi import Depends, HTTPException
from starlette import status

from core.dictionir.ROLE import UserRoles
from db.config import settings
from db.database import async_session_factory
from sqlalchemy.ext.asyncio import AsyncSession
from db.repositories import ReportRepository, S3StorageRepository, UserRepository
from db.repositories.report_delivery_log_repository import ReportDeliveryLogRepository
from db.secret_config import secret_settings
from services import ReportDeliveryService, AuthService
from services.email_schedule_send import EmailScheduleSend
from services.scheduler_service import SchedulerService

from utils import EmailService

#  Singleton экземпляр сервиса электронной почты
_email_service = None
async def get_email_service() -> EmailService:
    """
    Получение экземпляра сервиса отправки электронной почты.

    Returns:
        EmailService: сервис отправки электронной почты
    """
    global _email_service
    if _email_service is None:
        _email_service = EmailService(
            credentials_file=secret_settings.EMAIL_CREDENTIALS_FILE,
            app_email=secret_settings.EMAIL_APP_ADDRESS,
            app_name=secret_settings.EMAIL_APP_NAME,
            token_file=secret_settings.EMAIL_TOKEN_PATH
        )
    return _email_service

# Singleton экземпляр сервиса планировщика
_scheduler_service = None

async def get_scheduler_service() -> SchedulerService:
    """
    Получение экземпляра сервиса планировщика задач.

    Returns:
        SchedulerService: Сервис планировщика задач
    """
    global _scheduler_service
    if _scheduler_service is None:
        # Создаем строку подключения из настроек
        _scheduler_service = SchedulerService.get_instance(db_url_psycopg=settings.DATABASE_URL_psycopg,db_url_asyncpg=settings.DATABASE_URL_asyncpg)
    return _scheduler_service

_email_scheduler = None

async def get_email_scheduler(
        scheduler_service: SchedulerService = Depends(get_scheduler_service)
) -> EmailScheduleSend:
    """
    Получение экземпляра планировщика отправки email.

    Args:
        scheduler_service: Сервис планировщика задач

    Returns:
        EmailScheduleSend: Планировщик отправки электронной почты
    """
    global _email_scheduler
    if _email_scheduler is None:
        _email_scheduler = EmailScheduleSend(
            scheduler_service=scheduler_service,
            credentials_file=secret_settings.EMAIL_CREDENTIALS_FILE,
            app_email=secret_settings.EMAIL_APP_ADDRESS,
            app_name=secret_settings.EMAIL_APP_NAME,
            token_file=secret_settings.EMAIL_TOKEN_PATH
        )
    return _email_scheduler



async def get_db_session() -> AsyncGenerator[Any, Any]:
    async with async_session_factory() as session:
        yield session


async def get_s3_client() -> BaseClient:
    session = aioboto3.Session()

    async with session.client(
            's3',
            endpoint_url=settings.MINIO_ENDPOINT_URL,
            aws_access_key_id=settings.MINIO_ROOT_USER,
            aws_secret_access_key=settings.MINIO_ROOT_PASSWORD,
            region_name="us-east-1"
    ) as client:
        return client


async def get_s3_storage_repository(
        s3_client=Depends(get_s3_client)
) -> S3StorageRepository:
    repo = S3StorageRepository(s3_client, settings.MINIO_BUCKET)
    await repo.initialize()
    return repo

async def get_user_repository(session: AsyncSession = Depends(get_db_session)) -> UserRepository:
    return UserRepository(session)

async def get_report_repository(
        session: AsyncSession = Depends(get_db_session)
) -> ReportRepository:
    return ReportRepository(session)

async def get_report_delivery_log_repository(session: AsyncSession = Depends(get_db_session)) -> ReportDeliveryLogRepository:
    return ReportDeliveryLogRepository(session)

async def get_report_delivery_service(
        email_schedule_send: EmailScheduleSend = Depends(get_email_scheduler),
        user_repository: UserRepository = Depends(get_user_repository),
        s3_storage_repository: S3StorageRepository = Depends(get_s3_storage_repository),
        report_repository: ReportRepository = Depends(get_report_repository),
        report_delivery_log_repository: ReportDeliveryLogRepository = Depends(get_report_delivery_log_repository)
) -> ReportDeliveryService:
    return ReportDeliveryService(
        temp_files_dir=settings.TEMP_FILES_DIR,
        email_schedule_send=email_schedule_send,
        user_repository=user_repository,
        s3_storage_repository=s3_storage_repository,
        report_repository=report_repository,
        report_delivery_log_repository=report_delivery_log_repository
    )


async def get_auth_service(
        session: AsyncSession = Depends(get_db_session),
        email_schedule_send: EmailScheduleSend = Depends(get_email_scheduler)
) -> AuthService:
    return AuthService(
        session=session,
        email_schedule_send=email_schedule_send
    )

