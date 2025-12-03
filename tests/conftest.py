# tests/conftest.py
import sys
import os
import pytest
import asyncio
from typing import AsyncGenerator, Generator, Any

from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from _pytest.monkeypatch import MonkeyPatch

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# testcontainers используется для поднятия временной тестовой БД в контейнере
from testcontainers.postgres import PostgresContainer
from testcontainers.minio import MinioContainer

@pytest.fixture(scope="session")
def monkeypatch_session() -> Generator[MonkeyPatch, Any, None]:
    m = MonkeyPatch()
    yield m
    m.undo()

@pytest.fixture(scope="session", autouse=True)
def setup_test_environment(monkeypatch_session: MonkeyPatch):
    """
    Устанавливает переменные окружения для тестовых контейнеров перед импортом
    основного приложения. Это гарантирует, что настройки подхватятся до
    инициализации зависимостей.
    """
    with MinioContainer("minio/minio:RELEASE.2022-03-17T06-34-49Z") as minio:
        endpoint = minio.get_config()["endpoint"]
        monkeypatch_session.setenv("MINIO_ENDPOINT_URL", endpoint)
        monkeypatch_session.setenv("MINIO_ROOT_USER", "minioadmin")
        monkeypatch_session.setenv("MINIO_ROOT_PASSWORD", "minioadmin")
        monkeypatch_session.setenv("MINIO_BUCKET", "1ak-group-hack-bucket")
        
        # Устанавливаем и остальные переменные окружения, если они нужны для тестов
        monkeypatch_session.setenv("POSTGRES_USER", "testuser")
        monkeypatch_session.setenv("POSTGRES_PASSWORD", "testpassword")
        monkeypatch_session.setenv("POSTGRES_DB", "testdb")
        
        yield


# Добавляем корневую директорию проекта в sys.path, чтобы Python мог найти 'main_server'
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main_server.main import app
from main_server.core.dependencies import get_db_session
from main_server.db.models.base import Base

# Импортируем все модели, чтобы SQLAlchemy Base знал о них при создании таблиц
from main_server.db.models import user, activation_key, generated_report, report_delivery_log


# Параметры контейнера (можно изменить образ/параметры при необходимости)
POSTGRES_IMAGE = os.environ.get("TEST_POSTGRES_IMAGE", "postgres:15-alpine")

# Переменные, которые будут заполнены при старте контейнера
engine: AsyncSession | None = None
TestingSessionLocal = None
_container: PostgresContainer | None = None


@pytest.fixture(scope="session", autouse=True)
async def start_test_container():
    """
    Запускает Postgres в контейнере на время сессии тестов и создаёт SQLAlchemy async engine.
    По окончании сессии контейнер останавливается.
    """
    global _container, engine, TestingSessionLocal
    
    postgres_user = os.getenv("POSTGRES_USER")
    postgres_password = os.getenv("POSTGRES_PASSWORD")
    postgres_db = os.getenv("POSTGRES_DB")

    _container = PostgresContainer(
        POSTGRES_IMAGE, 
        username=postgres_user, 
        password=postgres_password,
        dbname=postgres_db
    )

    with _container as postgres:
        sync_url = postgres.get_connection_url()
        from urllib.parse import urlparse, unquote

        parsed = urlparse(sync_url)
        db_name = parsed.path.lstrip('/')
        user_name = unquote(parsed.username) if parsed.username else ''
        password = unquote(parsed.password) if parsed.password else ''
        host = parsed.hostname or 'localhost'
        port = parsed.port
        
        try:
            import psycopg
            driver = "psycopg"
        except ImportError:
            try:
                import asyncpg
                driver = "asyncpg"
            except ImportError:
                raise RuntimeError("Neither 'psycopg' nor 'asyncpg' is installed.")

        async_url = f"postgresql+{driver}://{user_name}:{password}@{host}:{port}/{db_name}"

        global engine, TestingSessionLocal
        engine = create_async_engine(async_url, future=True, echo=False)
        TestingSessionLocal = sessionmaker(
            autocommit=False, autoflush=False, bind=engine, class_=AsyncSession, expire_on_commit=False
        )

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        yield

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)


async def override_get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Переопределенная зависимость для сессии тестовой БД, использующая Testcontainers.
    """
    assert TestingSessionLocal is not None, "TestingSessionLocal is not initialized"
    async with TestingSessionLocal() as session:
        yield session


# Переопределяем зависимость get_db_session в приложении для тестов
app.dependency_overrides[get_db_session] = override_get_db_session


from unittest.mock import AsyncMock

# Shared mock object for email scheduler
mock_email_scheduler = AsyncMock()


def override_get_email_scheduler():
    return mock_email_scheduler

from main_server.core.dependencies import get_email_scheduler
app.dependency_overrides[get_email_scheduler] = override_get_email_scheduler


@pytest.fixture(autouse=True)
def reset_email_scheduler_mock():
    """Resets the mock's state before each test."""
    mock_email_scheduler.reset_mock()


@pytest.fixture
def email_scheduler_mock():
    """Provides the shared mock object for the email scheduler."""
    return mock_email_scheduler


@pytest.fixture(scope="function")
def client() -> Generator[TestClient, Any, None]:
    """
    Фикстура для тестового API клиента. Предоставляет новый клиент для каждого теста.
    """
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Provides a clean database session for each test.
    Cleans all data BEFORE each test to ensure isolation.
    """
    assert TestingSessionLocal is not None, "TestingSessionLocal is not initialized"
    async with TestingSessionLocal() as session:
        # Clean up all tables BEFORE each test to ensure clean state
        from sqlalchemy import text
        try:
            # Get all table names in correct order (respecting foreign keys - child tables first)
            table_names = [
                'report_delivery_log',
                'generated_reports',
                'activation_keys',
                'users'
            ]

            # PostgreSQL doesn't support IF EXISTS with TRUNCATE, so we check if table exists first
            for table_name in table_names:
                # Check if table exists and truncate it
                check_query = text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = :table_name
                    )
                """)
                result = await session.execute(check_query, {"table_name": table_name})
                table_exists = result.scalar()

                if table_exists:
                    # TRUNCATE with CASCADE to handle foreign keys
                    await session.execute(text(f'TRUNCATE TABLE {table_name} RESTART IDENTITY CASCADE'))

            await session.commit()
        except Exception as e:
            await session.rollback()
            print(f"Error during cleanup: {e}")

        yield session

        # Rollback any uncommitted changes
        await session.rollback()


@pytest.fixture(scope="function")
async def manager_user(db_session: AsyncSession) -> user.User:
    from main_server.services.auth_service import pwd_ctx

    password = "managerpassword"
    password_hash = pwd_ctx.hash(password)
    manager = user.User(
        email="manager@example.com",
        full_name="Manager User",
        password_hash=password_hash,
        user_type="manager"
    )
    db_session.add(manager)
    await db_session.commit()
    await db_session.refresh(manager)
    # Store password for later use in login
    manager.password = password

    yield manager


@pytest.fixture(scope="function")
def authenticated_manager_client(client: TestClient, manager_user: user.User) -> TestClient:
    login_data = {
        "username": manager_user.email,
        "password": manager_user.password,
    }
    response = client.post("/api/auth/login", data=login_data)
    assert response.status_code == 200, f"Failed to log in: {response.text}"
    token = response.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return client


@pytest.fixture(scope="function")
async def normal_user(db_session: AsyncSession) -> user.User:
    from main_server.services.auth_service import pwd_ctx

    password = "normalpassword"
    password_hash = pwd_ctx.hash(password)
    normal_user_obj = user.User(
        email="normal@example.com",
        full_name="Normal User",
        password_hash=password_hash,
        user_type="user"
    )
    db_session.add(normal_user_obj)
    await db_session.commit()
    await db_session.refresh(normal_user_obj)
    # Store password for later use in login
    normal_user_obj.password = password

    yield normal_user_obj


@pytest.fixture(scope="function")
def authenticated_normal_client(client: TestClient, normal_user: user.User) -> TestClient:
    login_data = {
        "username": normal_user.email,
        "password": normal_user.password,
    }
    response = client.post("/api/auth/login", data=login_data)
    assert response.status_code == 200, f"Failed to log in: {response.text}"
    token = response.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return client
