import asyncio
import uuid
from datetime import datetime, timedelta
import functools
from pathlib import Path
from typing import Optional, List, Union

from db.database import async_session_factory
from services.scheduler_service import SchedulerService
from utils.email import EmailService

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from db.repositories.report_delivery_log_repository import ReportDeliveryLogRepository
from db.enums import DeliveryMethodEnum, DeliveryStatusEnum

import threading


class EmailServiceManager:
    _services = {}
    _lock = threading.Lock()
    _all_sessions = []  # Для отслеживания всех созданных сессий

    @classmethod
    def register_session(cls, session):
        """Регистрация новой aiohttp сессии для отслеживания"""
        with cls._lock:
            if session not in cls._all_sessions:
                cls._all_sessions.append(session)

    @classmethod
    def get_service(cls, credentials_file, app_email, app_name, token_file):
        thread_id = threading.get_ident()
        key = thread_id

        with cls._lock:
            if key not in cls._services:
                email_service = EmailService(
                    credentials_file=credentials_file,
                    app_email=app_email,
                    app_name=app_name,
                    token_file=token_file
                )
                cls._services[key] = email_service

        return cls._services[key]

    @classmethod
    async def cleanup(cls, thread_id=None):
        """Закрыть сессию для конкретного потока"""
        with cls._lock:
            if thread_id is None:
                thread_id = threading.get_ident()

            if thread_id in cls._services:
                service = cls._services[thread_id]
                if hasattr(service, 'session') and service.session and not service.session.closed:
                    await service.session.close()
                    print(f"Закрыта сессия aiohttp для потока {thread_id}")
                del cls._services[thread_id]

    @classmethod
    async def cleanup_all_sessions(cls):
        """Закрыть все aiohttp сессии, включая те, что созданы googleapiclient"""
        import gc
        import aiohttp

        # Закрываем отслеживаемые сессии
        for session in list(cls._all_sessions):
            if not session.closed:
                try:
                    await session.close()
                    print(f"Закрыта отслеживаемая сессия aiohttp")
                except Exception as e:
                    print(f"Ошибка при закрытии отслеживаемой сессии: {e}")
        cls._all_sessions.clear()

        # Поиск и закрытие всех других сессий aiohttp
        found_sessions = 0
        for obj in gc.get_objects():
            if isinstance(obj, aiohttp.ClientSession) and not obj.closed:
                try:
                    await obj.close()
                    found_sessions += 1
                except Exception as e:
                    print(f"Ошибка при закрытии сессии: {e}")

        if found_sessions:
            print(f"Закрыто дополнительных сессий aiohttp: {found_sessions}")

# Менеджер соединений по потокам
class EventLoopEngineManager:
    _engines = {}
    _lock = threading.Lock()

    @classmethod
    def get_engine_factory(cls, db_url):
        thread_id = threading.get_ident()
        loop_id = id(asyncio.get_event_loop())
        key = (thread_id, loop_id)

        with cls._lock:
            if key not in cls._engines or db_url != cls._engines[key][0]:
                # Создаем новый движок для текущего потока и цикла событий
                async_engine = create_async_engine(
                    url=db_url,
                    echo=False,
                    pool_pre_ping=True,
                    pool_recycle=3600
                )

                local_session_factory = async_sessionmaker(
                    bind=async_engine,
                    class_=AsyncSession,
                    expire_on_commit=False
                )

                cls._engines[key] = (db_url, async_engine, local_session_factory)

        return cls._engines[key][2]

    @classmethod
    async def cleanup(cls, thread_id=None, loop_id=None):
        with cls._lock:
            if thread_id is None:
                thread_id = threading.get_ident()
            if loop_id is None:
                loop_id = id(asyncio.get_event_loop())

            key = (thread_id, loop_id)
            if key in cls._engines:
                _, engine, _ = cls._engines[key]
                await engine.dispose()
                del cls._engines[key]

    @classmethod
    async def cleanup_all(cls):
        """Очистка всех неиспользуемых соединений"""
        with cls._lock:
            keys = list(cls._engines.keys())
            for key in keys:
                try:
                    _, engine, _ = cls._engines[key]
                    await engine.dispose()
                    del cls._engines[key]
                except Exception:
                    pass


# Обертка для выполнения асинхронных функций в новом event loop
def run_async_in_thread(coro_func):
    """Декоратор для запуска корутины в новом цикле событий в потоке"""

    @functools.wraps(coro_func)
    def wrapper(*args, **kwargs):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(coro_func(*args, **kwargs))
        finally:
            loop.close()

    return wrapper


# Асинхронная функция для отправки email с оберткой для выполнения в потоке
@run_async_in_thread
async def send_registration_email_task(
        email: str,
        full_name: str,
        login: str,
        password: str,
        credentials_file: str,
        app_email: str,
        app_name: str,
        token_file: str
):
    """Асинхронная задача отправки email о регистрации"""
    # Создаем сервис email при выполнении задачи
    async with EmailService(
            credentials_file=credentials_file,
            app_email=app_email,
            app_name=app_name,
            token_file=token_file
    ) as email_service:
        # Отправляем email используя асинхронный метод
        return await email_service.send_registration_email(
            to=email,
            full_name=full_name,
            login=login,
            password=password
        )


@run_async_in_thread
async def send_mass_notification_task(
        to_email: str,
        message: str,
        subject: str,
        log_id: uuid.UUID,
        attachments: Optional[List[Union[str, Path]]],
        credentials_file: str,
        app_email: str,
        app_name: str,
        token_file: str,
        db_url_asyncpg: str
):

    try:
        # Получаем фабрику сессий для текущего потока
        local_session_factory = EventLoopEngineManager.get_engine_factory(db_url_asyncpg)

        # Получаем единый экземпляр EmailService для текущего потока
        email_service = EmailServiceManager.get_service(
            credentials_file=credentials_file,
            app_email=app_email,
            app_name=app_name,
            token_file=token_file
        )

        # Отправляем email
        success: bool = await email_service.send_email(
            to=to_email,
            subject=subject,
            text_content=message,
            attachments=attachments
        )

        if success is False:
            raise Exception("Ошибка при отправке email")

        # Обновляем статус в БД
        async with local_session_factory() as session:
            repo = ReportDeliveryLogRepository(session)
            await repo.update_status(log_id, DeliveryStatusEnum.SENT)
            await session.commit()

        return True
    except Exception as e:
        # В случае ошибки обновляем статус
        async with local_session_factory() as session:
            repo = ReportDeliveryLogRepository(session)
            await repo.update_status(log_id, DeliveryStatusEnum.FAILED, str(e))
            await session.commit()

        return False


class EmailScheduleSend:
    """Планировщик для отправки email-уведомлений"""

    def __init__(self, scheduler_service: SchedulerService, credentials_file, app_email, app_name, token_file):
        """
        Инициализация сервиса отправки email

        Args:
            scheduler_service: Сервис планировщика задач
            credentials_file: Путь к файлу с учетными данными
            app_email: Email приложения
            app_name: Имя приложения
            token_file: Путь к файлу с токеном
        """
        self.scheduler_service = scheduler_service
        self.credentials_file = credentials_file
        self.app_email = app_email
        self.app_name = app_name
        self.token_file = token_file

    async def schedule_registration_email(
            self,
            email: str,
            full_name: str,
            login: str,
            password: str,
            delay_seconds: int = 0
    ) -> str:
        """Планирование отправки email о регистрации"""
        run_date = datetime.now() + timedelta(seconds=delay_seconds)

        job = self.scheduler_service.add_job(
            send_registration_email_task,
            'date',
            run_date=run_date,
            kwargs={
                'email': email,
                'full_name': full_name,
                'login': login,
                'password': password,
                'credentials_file': self.credentials_file,
                'app_email': self.app_email,
                'app_name': self.app_name,
                'token_file': self.token_file
            },
            id=f'email_reg_{uuid.uuid4()}'
        )

        return job.id

    async def schedule_mass_report(
            self,
            user_info: list[tuple[str,uuid.UUID]],
            report_id: uuid.UUID,
            subject: str,
            message: str,
            attachments: Optional[List[Union[str, Path]]] = None,
            delay_seconds: int = 0
    ) -> dict:
        """
        Отправка массовых email-сообщений с вложениями

        Args:
            user_info: Список email-адресов и id получателей
            report_id: ID отчёта/рассылки
            subject: Тема сообщения
            message: Текст сообщения
            attachments: Список файлов-вложений (пути к файлам)
            delay_seconds: Задержка перед отправкой (секунды)

        Returns:
            dict: Словарь с результатами операции {job_ids: [], total: int}
        """
        run_date = datetime.now() + timedelta(seconds=delay_seconds)
        job_ids = []

        async with async_session_factory() as session:
            log_repo = ReportDeliveryLogRepository(session)

            for email, recipient_id in user_info:
                # Создаем запись в логе о начале отправки
                log = await log_repo.create_log(
                    recipient_id=recipient_id,
                    report_id=report_id,
                    method=DeliveryMethodEnum.EMAIL,
                    status=DeliveryStatusEnum.SENDING
                )

                # Планируем задачу отправки
                job = self.scheduler_service.add_job(
                    send_mass_notification_task,
                    'date',
                    run_date=run_date,
                    kwargs={
                        'to_email': email,
                        'message': message,
                        'subject': subject,
                        'log_id': log.id,
                        'attachments': attachments,
                        'credentials_file': self.credentials_file,
                        'app_email': self.app_email,
                        'app_name': self.app_name,
                        'token_file': self.token_file,
                        'db_url_asyncpg': self.scheduler_service.db_url_asyncpg
                    },
                    id=f'mass_email_{uuid.uuid4()}'
                )

                job_ids.append(job.id)

            await session.commit()

        return {
            "job_ids": job_ids,
            "total": len(user_info)
        }

    def cancel_job(self, job_id: str) -> bool:
        """Отмена запланированной задачи"""
        try:
            self.scheduler_service.remove_job(job_id)
            return True
        except Exception:
            return False
