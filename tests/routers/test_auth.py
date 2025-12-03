import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
import uuid
from types import SimpleNamespace

from main_server.main import app
from main_server.services import AuthService
from main_server.core.dependencies import get_auth_service, get_current_user, get_manager_user

@pytest.fixture
def mock_auth_service() -> AsyncMock:
    mock = AsyncMock(spec=AuthService)
    # Using dependency_overrides is the recommended way for testing with FastAPI
    original_auth = app.dependency_overrides.get(get_auth_service)
    app.dependency_overrides[get_auth_service] = lambda: mock
    yield mock
    # Clear the override after the test
    if original_auth:
        app.dependency_overrides[get_auth_service] = original_auth
    else:
        if get_auth_service in app.dependency_overrides:
            del app.dependency_overrides[get_auth_service]


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def manager_user_data():
    return SimpleNamespace(id=uuid.uuid4(), user_type="manager")


@pytest.fixture
def normal_user_data():
    return SimpleNamespace(id=uuid.uuid4(), user_type="user")

# These fixtures are now simpler as we can control the user object directly
@pytest.fixture
def mock_get_current_user(normal_user_data):
    original_current = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = lambda: normal_user_data
    yield
    if original_current:
        app.dependency_overrides[get_current_user] = original_current
    else:
        if get_current_user in app.dependency_overrides:
            del app.dependency_overrides[get_current_user]

@pytest.fixture
def mock_get_manager_user(manager_user_data):
    original_manager = app.dependency_overrides.get(get_manager_user)
    app.dependency_overrides[get_manager_user] = lambda: manager_user_data
    yield
    if original_manager:
        app.dependency_overrides[get_manager_user] = original_manager
    else:
        if get_manager_user in app.dependency_overrides:
            del app.dependency_overrides[get_manager_user]


def test_login(client, mock_auth_service):
    # Setup mock
    user_id = uuid.uuid4()
    mock_user = SimpleNamespace(id=user_id, user_type="user")
    mock_auth_service.login.return_value = mock_user

    # Call endpoint
    response = client.post("/api/auth/login", data={"username": "test@example.com", "password": "password"})

    # Assert
    assert response.status_code == 200
    assert "access_token" in response.json()
    mock_auth_service.login.assert_awaited_once_with("test@example.com", "password")


def test_register_user(client, mock_auth_service, mock_get_manager_user):
    # Setup mocks
    new_user_id = uuid.uuid4()
    mock_auth_service.register_user.return_value = SimpleNamespace(id=new_user_id, email="new@example.com", user_type="user")

    # Call endpoint
    response = client.post("/api/auth/register", json={"email": "new@example.com", "full_name": "New User", "role": "user"})

    # Assert
    assert response.status_code == 201
    mock_auth_service.register_user.assert_awaited_once_with(email="new@example.com", full_name="New User", password=None, role="user")


def test_generate_telegram_key(client, mock_auth_service, mock_get_current_user, normal_user_data):
    # Setup mocks
    mock_auth_service.generate_telegram_key.return_value = "test_key"

    # Call endpoint
    response = client.post("/api/auth/telegram/generate")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"key": "test_key"}
    mock_auth_service.generate_telegram_key.assert_awaited_once_with(normal_user_data.id)


def test_bind_telegram(client, mock_auth_service):
    # Setup mocks
    mock_auth_service.bind_telegram.return_value = SimpleNamespace(id=uuid.uuid4())

    # Call endpoint
    response = client.post("/api/auth/telegram/bind", json={"key": "test_key", "chat_id": "12345"})

    # Assert
    assert response.status_code == 200
    assert "success" in response.json()
    mock_auth_service.bind_telegram.assert_awaited_once_with("test_key", "12345")


def test_check_telegram_binding(client, mock_auth_service, mock_get_current_user, normal_user_data):
    # Setup mocks
    mock_auth_service.check_telegram_binding.return_value = (True, SimpleNamespace(id=normal_user_data.id))

    # Call endpoint
    response = client.get("/api/auth/telegram/is-bound")

    # Assert
    assert response.status_code == 200
    assert response.json() == {"is_bound": True}
    mock_auth_service.check_telegram_binding.assert_awaited_once_with(normal_user_data.id)


def test_reset_password(client, mock_auth_service, mock_get_manager_user):
    # Setup mocks
    mock_auth_service.reset_password.return_value = True
    user_id_to_reset = uuid.uuid4()

    # Call endpoint
    response = client.post("/api/auth/password/reset", json={"user_id": str(user_id_to_reset)})

    # Assert
    assert response.status_code == 200
    assert response.json()["success"] is True
    mock_auth_service.reset_password.assert_awaited_once_with(user_id_to_reset)


def test_change_password(client, mock_auth_service, mock_get_current_user, normal_user_data):
    # Setup mocks
    mock_auth_service.change_password.return_value = True

    # Call endpoint
    response = client.post("/api/auth/password/change", json={"old_password": "old", "new_password": "new"})
    
    # Assert
    assert response.status_code == 200
    assert response.json()["success"] is True
    mock_auth_service.change_password.assert_awaited_once_with(
        user_id=normal_user_data.id,
        old_password="old",
        new_password="new",
    )

def test_create_user(authenticated_manager_client: TestClient):
    """
    Тест успешного создания нового пользователя.
    """
    response = authenticated_manager_client.post(
        "/api/auth/register",
        json={"email": "testuser@example.com", "full_name": "Test User", "role": "user"}
    )
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["email"] == "testuser@example.com"
    assert "id" in data
    assert "password" not in data


def test_create_existing_user(authenticated_manager_client: TestClient):
    """
    Тест ошибки при создании пользователя с уже существующим email.
    """
    # Сначала создаем пользователя, чтобы убедиться, что он существует
    response = authenticated_manager_client.post(
        "/api/auth/register",
        json={"email": "existinguser@example.com", "full_name": "Existing User", "role": "user"}
    )
    assert response.status_code == 201

    # Повторная попытка создать того же пользователя
    response = authenticated_manager_client.post(
        "/api/auth/register",
        json={"email": "existinguser@example.com", "full_name": "Existing User", "role": "user"}
    )
    # Ожидаем ошибку 400 Bad Request, так как пользователь уже существует
    assert response.status_code == 400, response.text
    data = response.json()
    assert "detail" in data

def test_login_success(client: TestClient, manager_user):
    """
    Тест успешной аутентификации.
    """
    response = client.post(
        "/api/auth/login",
        data={"username": manager_user.email, "password": manager_user.password}
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "user_id" in data
    assert data["role"] == "manager"

def test_login_failure_wrong_password(client: TestClient, manager_user):
    """
    Тест ошибки аутентификации с неверным паролем.
    """
    response = client.post(
        "/api/auth/login",
        data={"username": manager_user.email, "password": "wrongpassword"}
    )
    assert response.status_code == 401, response.text

def test_login_failure_wrong_email(client: TestClient):
    """
    Тест ошибки аутентификации с несуществующим email.
    """
    response = client.post(
        "/api/auth/login",
        data={"username": "nouser@example.com", "password": "somepassword"}
    )
    assert response.status_code == 401, response.text


def test_full_user_workflow(
    client: TestClient,
    authenticated_manager_client: TestClient,
    normal_user,
    email_scheduler_mock,
):
    """
    Тест полного жизненного цикла пользователя:
    1. Пользователь входит в систему.
    2. Пользователь генерирует ключ Telegram.
    3. Пользователь меняет пароль.
    4. Пользователь входит в систему с новым паролем.
    5. Менеджер сбрасывает пароль пользователя.
    6. Пользователь не может войти со старым (измененным) паролем.
    7. Пользователь входит в систему с новым, сброшенным паролем, полученным из "email".
    """
    # 1. Пользователь входит в систему (используя оригинальный пароль из фикстуры)
    login_response = client.post(
        "/api/auth/login",
        data={"username": normal_user.email, "password": normal_user.password}
    )
    assert login_response.status_code == 200, "Step 1 Failed: Login"
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Пользователь генерирует ключ Telegram
    tg_key_response = client.post("/api/auth/telegram/generate", headers=headers)
    assert tg_key_response.status_code == 200, "Step 2 Failed: Generate Telegram Key"
    assert "key" in tg_key_response.json()

    # 3. Пользователь меняет пароль
    password_after_change = "a_brand_new_password"
    change_pw_response = client.post(
        "/api/auth/password/change",
        headers=headers,
        json={"old_password": normal_user.password, "new_password": password_after_change}
    )
    assert change_pw_response.status_code == 200, "Step 3 Failed: Password Change"
    assert change_pw_response.json()["success"] is True

    # 4. Пользователь входит в систему с новым паролем
    new_login_response = client.post(
        "/api/auth/login",
        data={"username": normal_user.email, "password": password_after_change}
    )
    assert new_login_response.status_code == 200, "Step 4 Failed: Login with new password"

    # 5. Менеджер сбрасывает пароль пользователя
    reset_pw_response = authenticated_manager_client.post(
        "/api/auth/password/reset",
        json={"user_id": str(normal_user.id)}
    )
    assert reset_pw_response.status_code == 200, "Step 5 Failed: Manager resets password"
    assert reset_pw_response.json()["success"] is True
    
    # 6. Пользователь не может войти со старым (измененным) паролем
    failed_login_response = client.post(
        "/api/auth/login",
        data={"username": normal_user.email, "password": password_after_change}
    )
    assert failed_login_response.status_code == 401, "Step 6 Failed: Login with old password should fail"

    # 7. Пользователь входит в систему с новым, сброшенным паролем, полученным из "email".
    email_scheduler_mock.schedule_password_reset_notification.assert_awaited_once()
    call_args = email_scheduler_mock.schedule_password_reset_notification.await_args
    reset_password = call_args.kwargs["password"]

    final_login_response = client.post(
        "/api/auth/login",
        data={"username": normal_user.email, "password": reset_password}
    )
    assert final_login_response.status_code == 200, "Step 7 Failed: Login with reset password from email"