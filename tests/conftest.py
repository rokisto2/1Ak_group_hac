# tests/conftest.py
import sys
import os
import pytest
import asyncio
from typing import AsyncGenerator, Generator, Any

from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# Добавляем корневую директорию проекта в sys.path, чтобы Python мог найти 'main_server'
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main_server.main import app
from main_server.core.dependencies import get_db_session  # ИСПРАВЛЕНО: правильный импорт
from main_server.db.models.base import Base

# Импортируем все модели, чтобы SQLAlchemy Base знал о них при создании таблиц
from main_server.db.models import user, activation_key, generated_report, report_delivery_log

# URL для подключения к тестовой БД из Docker
TEST_DATABASE_URL = "postgresql+psycopg://testuser:testpassword@localhost:5433/testdb"

engine = create_async_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, class_=AsyncSession)


async def override_get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Переопределенная зависимость для сессии тестовой БД.
    """
    async with TestingSessionLocal() as session:
        yield session


# Переопределяем зависимость get_db_session в приложении для тестов
app.dependency_overrides[get_db_session] = override_get_db_session  # ИСПРАВЛЕНО: используется правильная зависимость


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


@pytest.fixture(scope="session", autouse=True)
async def setup_database():
    """
    Создает и удаляет таблицы в тестовой БД до и после всех тестов.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="function")
def client() -> Generator[TestClient, Any, None]:
    """
    Фикстура для тестового API клиента. Предоставляет новый клиент для каждого теста.
    """
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with TestingSessionLocal() as session:
        yield session


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
    
    await db_session.delete(manager)
    await db_session.commit()


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
    
    await db_session.delete(normal_user_obj)
    await db_session.commit()

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