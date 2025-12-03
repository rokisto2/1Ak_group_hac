import pytest
from unittest.mock import MagicMock, patch, call
from main_server.services.scheduler_service import SchedulerService
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.executors.pool import ThreadPoolExecutor
from apscheduler.schedulers.asyncio import AsyncIOScheduler

@pytest.fixture(autouse=True)
def cleanup_singleton():
    """Ensure the singleton instance is reset before each test."""
    SchedulerService._instance = None
    yield
    SchedulerService._instance = None


@pytest.fixture
def mock_sqlalchemy_jobstore():
    with patch('main_server.services.scheduler_service.SQLAlchemyJobStore') as mock:
        yield mock

@pytest.fixture
def mock_threadpool_executor():
    with patch('main_server.services.scheduler_service.ThreadPoolExecutor') as mock:
        yield mock

@pytest.fixture
def mock_asyncio_scheduler():
    with patch('main_server.services.scheduler_service.AsyncIOScheduler') as mock:
        yield mock

@pytest.fixture
def scheduler_service_instance(mock_asyncio_scheduler, mock_sqlalchemy_jobstore, mock_threadpool_executor):
    return SchedulerService("sqlite:///test_psycopg.db", "sqlite+asyncpg:///test_asyncpg.db")


def test_get_instance_creates_new_instance(mock_asyncio_scheduler, mock_sqlalchemy_jobstore, mock_threadpool_executor):
    instance1 = SchedulerService.get_instance("sqlite:///test1.db", "sqlite+asyncpg:///test1_asyncpg.db")
    assert isinstance(instance1, SchedulerService)
    mock_asyncio_scheduler.assert_called_once()
    assert instance1.db_url_psycopg == "sqlite:///test1.db"
    assert instance1.db_url_asyncpg == "sqlite+asyncpg:///test1_asyncpg.db"


def test_get_instance_returns_same_instance(mock_asyncio_scheduler, mock_sqlalchemy_jobstore, mock_threadpool_executor):
    instance1 = SchedulerService.get_instance("sqlite:///test2.db", "sqlite+asyncpg:///test2_asyncpg.db")
    instance2 = SchedulerService.get_instance("sqlite:///test2.db", "sqlite+asyncpg:///test2_asyncpg.db")
    assert instance1 is instance2
    mock_asyncio_scheduler.assert_called_once() # Should only be called once


def test_scheduler_init(mock_asyncio_scheduler, mock_sqlalchemy_jobstore, mock_threadpool_executor):
    service = SchedulerService("sqlite:///init.db", "sqlite+asyncpg:///init_asyncpg.db")
    mock_asyncio_scheduler.assert_called_once()
    service.scheduler.start.assert_called_once()
    assert service.db_url_psycopg == "sqlite:///init.db"
    assert service.db_url_asyncpg == "sqlite+asyncpg:///init_asyncpg.db"


def test_add_job(scheduler_service_instance):
    mock_job = MagicMock()
    scheduler_service_instance.scheduler.add_job.return_value = mock_job
    
    job = scheduler_service_instance.add_job("func", "date", run_date="2025-12-01")
    
    assert job is mock_job
    scheduler_service_instance.scheduler.add_job.assert_called_once_with(
        "func", "date", run_date="2025-12-01"
    )

def test_remove_job(scheduler_service_instance):
    scheduler_service_instance.remove_job("job_id_123")
    scheduler_service_instance.scheduler.remove_job.assert_called_once_with("job_id_123")

def test_shutdown(scheduler_service_instance):
    scheduler_service_instance.shutdown()
    scheduler_service_instance.scheduler.shutdown.assert_called_once()
    assert SchedulerService._instance is None
