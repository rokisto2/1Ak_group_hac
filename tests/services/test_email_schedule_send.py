import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from main_server.services.email_schedule_send import EmailScheduleSend
from main_server.services.scheduler_service import SchedulerService
import uuid

@pytest.fixture
def mock_scheduler_service():
    """Fixture for a mocked SchedulerService."""
    service = MagicMock(spec=SchedulerService)
    service.db_url_asyncpg = "dummy_db_url"
    return service

@pytest.fixture
def email_schedule_send(mock_scheduler_service):
    """Fixture to create an EmailScheduleSend instance for testing."""
    credentials_file = "dummy_credentials.json"
    app_email = "test@example.com"
    app_name = "Test App"
    token_file = "dummy_token.json"
    
    return EmailScheduleSend(
        scheduler_service=mock_scheduler_service,
        credentials_file=credentials_file,
        app_email=app_email,
        app_name=app_name,
        token_file=token_file,
    )

def test_email_schedule_send_init(email_schedule_send, mock_scheduler_service):
    """Test the __init__ method of EmailScheduleSend."""
    assert email_schedule_send.scheduler_service == mock_scheduler_service
    assert email_schedule_send.credentials_file == "dummy_credentials.json"
    assert email_schedule_send.app_email == "test@example.com"
    assert email_schedule_send.app_name == "Test App"
    assert email_schedule_send.token_file == "dummy_token.json"

@pytest.mark.asyncio
async def test_schedule_password_reset_notification(email_schedule_send, mock_scheduler_service):
    """Test scheduling a password reset notification."""
    mock_job = MagicMock()
    mock_job.id = "job_123"
    mock_scheduler_service.add_job.return_value = mock_job

    job_id = await email_schedule_send.schedule_password_reset_notification(
        email="test@example.com",
        full_name="Test User",
        login="testuser",
        password="password",
    )

    assert job_id == "job_123"
    mock_scheduler_service.add_job.assert_called_once()
    _, kwargs = mock_scheduler_service.add_job.call_args
    assert kwargs['kwargs']['email'] == "test@example.com"

@pytest.mark.asyncio
async def test_schedule_registration_email(email_schedule_send, mock_scheduler_service):
    """Test scheduling a registration email."""
    mock_job = MagicMock()
    mock_job.id = "job_456"
    mock_scheduler_service.add_job.return_value = mock_job

    job_id = await email_schedule_send.schedule_registration_email(
        email="test@example.com",
        full_name="Test User",
        login="testuser",
        password="password",
    )

    assert job_id == "job_456"
    mock_scheduler_service.add_job.assert_called_once()
    _, kwargs = mock_scheduler_service.add_job.call_args
    assert kwargs['kwargs']['email'] == "test@example.com"

def test_cancel_job(email_schedule_send, mock_scheduler_service):
    """Test canceling a job."""
    result = email_schedule_send.cancel_job("job_123")
    assert result is True
    mock_scheduler_service.remove_job.assert_called_once_with("job_123")

@pytest.mark.asyncio
@patch('main_server.services.email_schedule_send.async_session_factory')
async def test_schedule_mass_report(mock_async_session_factory, email_schedule_send, mock_scheduler_service):
    """Test scheduling a mass report."""
    # Mock the session and repository
    mock_session = AsyncMock()
    mock_async_session_factory.return_value.__aenter__.return_value = mock_session
    mock_log_repo = MagicMock()
    mock_log_repo.create_log = AsyncMock(return_value=MagicMock(id=uuid.uuid4()))
    
    with patch('main_server.services.email_schedule_send.ReportDeliveryLogRepository', return_value=mock_log_repo):
        user_info = [("user1@example.com", uuid.uuid4()), ("user2@example.com", uuid.uuid4())]
        report_id = uuid.uuid4()
        
        mock_job = MagicMock()
        mock_job.id = "mass_job_123"
        mock_scheduler_service.add_job.return_value = mock_job

        result = await email_schedule_send.schedule_mass_report(
            user_info=user_info,
            report_id=report_id,
            subject="Mass Report",
            message="Here is your report.",
        )

        assert result['total'] == 2
        assert len(result['job_ids']) == 2
        assert mock_log_repo.create_log.call_count == 2
        assert mock_scheduler_service.add_job.call_count == 2
        mock_session.commit.assert_called_once()
