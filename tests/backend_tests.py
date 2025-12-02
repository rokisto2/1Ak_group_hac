# tests/backend_tests.py
from fastapi.testclient import TestClient
import pytest


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