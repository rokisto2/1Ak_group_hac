from datetime import datetime
from typing import Any, AsyncGenerator
import aioboto3
import timedelta
from botocore.client import BaseClient
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from starlette import status
from jose import JWTError, jwt

from main_server.core.dictionir.ROLE import UserRoles
from main_server.db.config import settings
from main_server.db.database import async_session_factory
from sqlalchemy.ext.asyncio import AsyncSession
from main_server.db.repositories import ReportRepository, S3StorageRepository, UserRepository
from main_server.db.repositories.report_delivery_log_repository import ReportDeliveryLogRepository
from main_server.services import ReportDeliveryService, AuthService
from main_server.services.email_schedule_send import EmailScheduleSend
from main_server.services.scheduler_service import SchedulerService
from uuid import UUID
from main_server.services.email import EmailService

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
        report_delivery_log_repository=report_delivery_log_repository,
        tg_bot_api_url=secret_settings.TG_BOT_API_URL
    )

async def get_auth_service(
        session: AsyncSession = Depends(get_db_session),
        email_schedule_send: EmailScheduleSend = Depends(get_email_scheduler)
) -> AuthService:
    return AuthService(
        session=session,
        email_schedule_send=email_schedule_send
    )

from main_server.db.secret_config import secret_settings

# Используем настройки JWT
SECRET_KEY = secret_settings.SECRET_KEY
ALGORITHM = secret_settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = secret_settings.ACCESS_TOKEN_EXPIRE_MINUTES

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(
        token: str = Depends(oauth2_scheme),
        auth_service: AuthService = Depends(get_auth_service)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Недействительные учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await auth_service.user_repo.get(UUID(user_id))
    if user is None:
        raise credentials_exception
    return user


async def get_admin_user(user=Depends(get_current_user)):
    """
    Проверка, что текущий пользователь имеет права суперпользователя.

    Args:
        user: Текущий пользователь

    Returns:
        User: Пользователь с правами суперпользователя

    Raises:
        HTTPException: Если у пользователя недостаточно прав
    """
    if user.user_type != UserRoles.SUPERUSER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав доступа"
        )
    return user


async def get_manager_user(user=Depends(get_current_user)):
    """
    Проверка, что текущий пользователь имеет права менеджера.

    Args:
        user: Текущий пользователь

    Returns:
        User: Пользователь с правами менеджера

    Raises:
        HTTPException: Если у пользователя недостаточно прав
    """
    if user.user_type != UserRoles.MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав доступа"
        )
    return user

