import asyncio
import pytest
from unittest.mock import MagicMock, AsyncMock, patch

from fastapi import HTTPException

from main_server.services.auth_service import AuthService


@pytest.fixture
def mock_session():
    return MagicMock()

@pytest.fixture
def mock_email_schedule_send():
    return MagicMock()

@pytest.fixture
def auth_service(mock_session, mock_email_schedule_send):
    return AuthService(mock_session, mock_email_schedule_send)

@pytest.mark.asyncio
async def test_generate_password(auth_service):
    password = auth_service._generate_password(12)
    assert len(password) == 12

@pytest.mark.asyncio
async def test_register_user_success(auth_service):
    # Setup mocks
    auth_service.user_repo.get_by_email = AsyncMock(return_value=None)
    auth_service.user_repo.create_user = AsyncMock(return_value=MagicMock())
    auth_service.email_schedule_send.schedule_registration_email = AsyncMock()

    # Call the method
    user = await auth_service.register_user("test@example.com", "Test User", "password")

    # Assertions
    assert user is not None
    auth_service.user_repo.get_by_email.assert_called_once_with("test@example.com")
    auth_service.user_repo.create_user.assert_called_once()
    auth_service.email_schedule_send.schedule_registration_email.assert_called_once()

@pytest.mark.asyncio
async def test_register_user_existing_email(auth_service):
    # Setup mocks
    auth_service.user_repo.get_by_email = AsyncMock(return_value=MagicMock())

    # Call the method and expect an exception
    with pytest.raises(HTTPException) as exc_info:
        await auth_service.register_user("test@example.com", "Test User", "password")

    # Assertions
    assert exc_info.value.status_code == 400
    assert "Пользователь с такой почтой уже существует" in exc_info.value.detail
    auth_service.user_repo.get_by_email.assert_called_once_with("test@example.com")

@pytest.mark.asyncio
async def test_login_success(auth_service):
    # Setup mocks
    mock_user = MagicMock()
    mock_user.password_hash = "$2b$12$E.qA7.d8U8v.j/O.C.E.L.upRkX1Yg.E8z.z8M.z8Y.z8Y.z8Y.z8"  # "password"
    auth_service.user_repo.get_by_email = AsyncMock(return_value=mock_user)
    with patch('main_server.services.auth_service.pwd_ctx') as mock_pwd_ctx:
        mock_pwd_ctx.verify.return_value = True

        # Call the method
        user = await auth_service.login("test@example.com", "password")

        # Assertions
        assert user is not None
        auth_service.user_repo.get_by_email.assert_called_once_with("test@example.com")
        mock_pwd_ctx.verify.assert_called_once()

@pytest.mark.asyncio
async def test_login_invalid_email(auth_service):
    # Setup mocks
    auth_service.user_repo.get_by_email = AsyncMock(return_value=None)

    # Call the method and expect an exception
    with pytest.raises(HTTPException) as exc_info:
        await auth_service.login("test@example.com", "password")

    # Assertions
    assert exc_info.value.status_code == 401
    assert "Неверный email или пароль" in exc_info.value.detail
    auth_service.user_repo.get_by_email.assert_called_once_with("test@example.com")

@pytest.mark.asyncio
async def test_login_invalid_password(auth_service):
    # Setup mocks
    mock_user = MagicMock()
    mock_user.password_hash = "wrong_hash"
    auth_service.user_repo.get_by_email = AsyncMock(return_value=mock_user)
    with patch('main_server.services.auth_service.pwd_ctx') as mock_pwd_ctx:
        mock_pwd_ctx.verify.return_value = False

        # Call the method and expect an exception
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.login("test@example.com", "password")

        # Assertions
        assert exc_info.value.status_code == 401
        assert "Неверный email или пароль" in exc_info.value.detail
        auth_service.user_repo.get_by_email.assert_called_once_with("test@example.com")
        mock_pwd_ctx.verify.assert_called_once()

@pytest.mark.asyncio
async def test_reset_password_success(auth_service):
    # Setup mocks
    mock_user = MagicMock()
    mock_user.email = "test@example.com"
    mock_user.full_name = "Test User"
    auth_service.user_repo.get = AsyncMock(return_value=mock_user)
    auth_service.user_repo.update_user_info = AsyncMock()
    auth_service.email_schedule_send.schedule_password_reset_notification = AsyncMock()

    # Call the method
    result = await auth_service.reset_password("some_uuid")

    # Assertions
    assert result is True
    auth_service.user_repo.get.assert_called_once_with("some_uuid")
    auth_service.user_repo.update_user_info.assert_called_once()
    auth_service.email_schedule_send.schedule_password_reset_notification.assert_called_once()

@pytest.mark.asyncio
async def test_reset_password_user_not_found(auth_service):
    # Setup mocks
    auth_service.user_repo.get = AsyncMock(return_value=None)

    # Call the method and expect an exception
    with pytest.raises(HTTPException) as exc_info:
        await auth_service.reset_password("some_uuid")

    # Assertions
    assert exc_info.value.status_code == 404
    assert "Пользователь не найден" in exc_info.value.detail
    auth_service.user_repo.get.assert_called_once_with("some_uuid")

@pytest.mark.asyncio
async def test_check_telegram_binding_true(auth_service):
    # Setup mocks
    mock_user = MagicMock()
    mock_user.chat_id = "some_chat_id"
    auth_service.user_repo.get = AsyncMock(return_value=mock_user)

    # Call the method
    is_bound, user = await auth_service.check_telegram_binding("some_uuid")

    # Assertions
    assert is_bound is True
    assert user is not None
    auth_service.user_repo.get.assert_called_once_with("some_uuid")

@pytest.mark.asyncio
async def test_check_telegram_binding_false(auth_service):
    # Setup mocks
    mock_user = MagicMock()
    mock_user.chat_id = None
    auth_service.user_repo.get = AsyncMock(return_value=mock_user)

    # Call the method
    is_bound, user = await auth_service.check_telegram_binding("some_uuid")

    # Assertions
    assert is_bound is False
    assert user is not None
    auth_service.user_repo.get.assert_called_once_with("some_uuid")

@pytest.mark.asyncio
async def test_check_telegram_binding_user_not_found(auth_service):
    # Setup mocks
    auth_service.user_repo.get = AsyncMock(return_value=None)

    # Call the method
    is_bound, user = await auth_service.check_telegram_binding("some_uuid")

    # Assertions
    assert is_bound is False
    assert user is None
    auth_service.user_repo.get.assert_called_once_with("some_uuid")

@pytest.mark.asyncio
async def test_generate_telegram_key_success(auth_service):
    # Setup mocks
    mock_user = MagicMock()
    auth_service.user_repo.get = AsyncMock(return_value=mock_user)
    mock_activation_key = MagicMock()
    mock_activation_key.key = "some_key"
    auth_service.activation_key_repo.upsert_key = AsyncMock(return_value=mock_activation_key)

    # Call the method
    key = await auth_service.generate_telegram_key("some_uuid")

    # Assertions
    assert key == "some_key"
    auth_service.user_repo.get.assert_called_once_with("some_uuid")
    auth_service.activation_key_repo.upsert_key.assert_called_once()

@pytest.mark.asyncio
async def test_generate_telegram_key_user_not_found(auth_service):
    # Setup mocks
    auth_service.user_repo.get = AsyncMock(return_value=None)

    # Call the method and expect an exception
    with pytest.raises(HTTPException) as exc_info:
        await auth_service.generate_telegram_key("some_uuid")

    # Assertions
    assert exc_info.value.status_code == 404
    assert "Пользователь не найден" in exc_info.value.detail
    auth_service.user_repo.get.assert_called_once_with("some_uuid")

@pytest.mark.asyncio
async def test_change_password_success(auth_service):
    # Setup mocks
    mock_user = MagicMock()
    mock_user.password_hash = "$2b$12$E.qA7.d8U8v.j/O.C.E.L.upRkX1Yg.E8z.z8M.z8Y.z8Y.z8Y.z8"  # "password"
    auth_service.user_repo.get = AsyncMock(return_value=mock_user)
    auth_service.user_repo.update_user_info = AsyncMock()
    with patch('main_server.services.auth_service.pwd_ctx') as mock_pwd_ctx:
        mock_pwd_ctx.verify.return_value = True
        mock_pwd_ctx.hash.return_value = "new_hashed_password"

        # Call the method
        result = await auth_service.change_password("some_uuid", "password", "new_password")

        # Assertions
        assert result is True
        auth_service.user_repo.get.assert_called_once_with("some_uuid")
        mock_pwd_ctx.verify.assert_called_once()
        auth_service.user_repo.update_user_info.assert_called_once_with(
            user_id='some_uuid',
            password_hash='new_hashed_password'
        )

@pytest.mark.asyncio
async def test_change_password_user_not_found(auth_service):
    # Setup mocks
    auth_service.user_repo.get = AsyncMock(return_value=None)

    # Call the method and expect an exception
    with pytest.raises(HTTPException) as exc_info:
        await auth_service.change_password("some_uuid", "old_password", "new_password")

    # Assertions
    assert exc_info.value.status_code == 404
    assert "Пользователь не найден" in exc_info.value.detail
    auth_service.user_repo.get.assert_called_once_with("some_uuid")

@pytest.mark.asyncio
async def test_change_password_invalid_old_password(auth_service):
    # Setup mocks
    mock_user = MagicMock()
    mock_user.password_hash = "wrong_hash"
    auth_service.user_repo.get = AsyncMock(return_value=mock_user)
    with patch('main_server.services.auth_service.pwd_ctx') as mock_pwd_ctx:
        mock_pwd_ctx.verify.return_value = False

        # Call the method and expect an exception
        with pytest.raises(HTTPException) as exc_info:
            await auth_service.change_password("some_uuid", "old_password", "new_password")

        # Assertions
        assert exc_info.value.status_code == 400
        assert "Неправильный текущий пароль" in exc_info.value.detail
        auth_service.user_repo.get.assert_called_once_with("some_uuid")
        mock_pwd_ctx.verify.assert_called_once()
