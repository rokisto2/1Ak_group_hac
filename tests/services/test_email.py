import pytest
from unittest.mock import patch, MagicMock, mock_open
from main_server.services.email import EmailService
import os

@pytest.fixture
def email_service():
    """Fixture to create an EmailService instance for testing."""
    credentials_file = "dummy_credentials.json"
    token_file = "dummy_token.json"
    app_email = "test@example.com"
    app_name = "Test App"

    # Create dummy files
    with open(credentials_file, "w") as f:
        f.write("{}")
    with open(token_file, "w") as f:
        f.write("{}")

    service = EmailService(
        credentials_file=credentials_file,
        token_file=token_file,
        app_email=app_email,
        app_name=app_name,
    )
    yield service

    # Cleanup dummy files
    os.remove(credentials_file)
    os.remove(token_file)


def test_email_service_init(email_service):
    """Test the __init__ method of EmailService."""
    assert email_service.app_email == "test@example.com"
    assert email_service.app_name == "Test App"
    assert email_service.credentials_file == "dummy_credentials.json"
    assert email_service.token_file == "dummy_token.json"
    assert email_service.scopes == ['https://www.googleapis.com/auth/gmail.send']
    assert email_service.service is None
    assert email_service.session is None


@pytest.mark.asyncio
@patch('main_server.services.email.build')
@patch('main_server.services.email.Credentials')
@patch('main_server.services.email.InstalledAppFlow')
async def test_get_service(mock_flow, mock_credentials, mock_build, email_service):
    """Test the _get_service method."""
    # Mocking file existence
    with patch('os.path.exists', return_value=True):
        # Mocking credentials
        mock_creds_instance = MagicMock()
        mock_creds_instance.valid = True
        mock_credentials.from_authorized_user_file.return_value = mock_creds_instance

        # Call the method
        service = await email_service._get_service()

        # Assertions
        mock_credentials.from_authorized_user_file.assert_called_once_with(email_service.token_file, email_service.scopes)
        mock_build.assert_called_once_with('gmail', 'v1', credentials=mock_creds_instance)
        assert service is not None

@pytest.mark.asyncio
async def test_send_email_no_content(email_service):
    """Test send_email with no content."""
    with pytest.raises(ValueError, match="Either text_content or html_content must be provided."):
        await email_service.send_email(to="recipient@example.com", subject="Test")


@pytest.mark.asyncio
@patch.object(EmailService, '_get_service')
async def test_send_email_success(mock_get_service, email_service):
    """Test successful email sending."""
    # Mock the service
    mock_gmail_service = MagicMock()
    mock_get_service.return_value = mock_gmail_service

    # Mock the send method
    mock_send = MagicMock()
    mock_gmail_service.users.return_value.messages.return_value.send.return_value = mock_send

    # Call the method
    result = await email_service.send_email(
        to="recipient@example.com",
        subject="Test",
        text_content="Hello, world!",
    )

    # Assertions
    assert result is True
    mock_gmail_service.users.return_value.messages.return_value.send.assert_called_once()
    mock_send.execute.assert_called_once()


@pytest.mark.asyncio
@patch.object(EmailService, 'send_email')
async def test_send_registration_email(mock_send_email, email_service):
    """Test send_registration_email."""
    # Call the method
    await email_service.send_registration_email(
        to="recipient@example.com",
        full_name="Test User",
        login="testuser",
        password="password",
    )

    # Assertions
    mock_send_email.assert_called_once()
    args, kwargs = mock_send_email.call_args
    assert kwargs['to'] == "recipient@example.com"
    assert "Регистрация в системе" in kwargs['subject']
    assert "testuser" in kwargs['html_content']
    assert "password" in kwargs['html_content']
    assert "testuser" in kwargs['text_content']
    assert "password" in kwargs['text_content']
