from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.executors.pool import ThreadPoolExecutor

class SchedulerService:
    """Сервис для управления планировщиком задач"""

    _instance = None

    @classmethod
    def get_instance(cls, db_url_psycopg: str,db_url_asyncpg:str):
        """Получить или создать экземпляр сервиса планировщика"""
        if cls._instance is None:
            cls._instance = cls(db_url_psycopg,db_url_asyncpg)
        return cls._instance

    def __init__(self, db_url_psycopg: str,db_url_asyncpg:str):
        """
        Инициализация планировщика задач

        Args:
            db_url_psycopg: URL подключения к базе данных для хранения задач
        """
        jobstores = {'default': SQLAlchemyJobStore(url=db_url_psycopg)}
        executors = {'default': ThreadPoolExecutor(20)}
        job_defaults = {
            'coalesce': True,
            'max_instances': 3,
            'misfire_grace_time': 3600
        }

        self.scheduler = AsyncIOScheduler(
            jobstores=jobstores,
            executors=executors,
            job_defaults=job_defaults
        )
        self.scheduler.start()
        self.db_url_psycopg = db_url_psycopg
        self.db_url_asyncpg = db_url_asyncpg

    def add_job(self, *args, **kwargs):
        """Добавление задачи в планировщик"""
        return self.scheduler.add_job(*args, **kwargs)

    def remove_job(self, job_id: str):
        """Удаление задачи из планировщика"""
        return self.scheduler.remove_job(job_id)

    def shutdown(self):
        """Остановка планировщика"""
        self.scheduler.shutdown()
        SchedulerService._instance = None