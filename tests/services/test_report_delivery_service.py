import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from main_server.services.report_delivery_service import ReportDeliveryService
from main_server.services.email_schedule_send import EmailScheduleSend
from main_server.db.repositories import UserRepository, S3StorageRepository, ReportRepository, ReportDeliveryLogRepository
from main_server.core.dictionir import DeliveryMethodEnum
import uuid

@pytest.fixture
def mock_email_schedule_send():
    return MagicMock(spec=EmailScheduleSend)

@pytest.fixture
def mock_user_repository():
    return MagicMock(spec=UserRepository)

@pytest.fixture
def mock_s3_storage_repository():
    return MagicMock(spec=S3StorageRepository)

@pytest.fixture
def mock_report_repository():
    return MagicMock(spec=ReportRepository)

@pytest.fixture
def mock_report_delivery_log_repository():
    return MagicMock(spec=ReportDeliveryLogRepository)

@pytest.fixture
def report_delivery_service(
    mock_email_schedule_send,
    mock_user_repository,
    mock_s3_storage_repository,
    mock_report_repository,
    mock_report_delivery_log_repository,
):
    return ReportDeliveryService(
        temp_files_dir="/tmp",
        email_schedule_send=mock_email_schedule_send,
        user_repository=mock_user_repository,
        s3_storage_repository=mock_s3_storage_repository,
        report_repository=mock_report_repository,
        report_delivery_log_repository=mock_report_delivery_log_repository,
    )

def test_report_delivery_service_init(
    report_delivery_service,
    mock_email_schedule_send,
    mock_user_repository,
    mock_s3_storage_repository,
    mock_report_repository,
    mock_report_delivery_log_repository,
):
    assert report_delivery_service.email_schedule_send == mock_email_schedule_send
    assert report_delivery_service.user_repository == mock_user_repository
    assert report_delivery_service.s3_storage_repository == mock_s3_storage_repository
    assert report_delivery_service.report_repository == mock_report_repository
    assert report_delivery_service.report_delivery_log_repository == mock_report_delivery_log_repository

@pytest.mark.asyncio
async def test_send_messages_platform(report_delivery_service, mock_report_delivery_log_repository):
    user_ids = [uuid.uuid4(), uuid.uuid4()]
    report_id = uuid.uuid4()
    mock_report_delivery_log_repository.bulk_create_logs = AsyncMock()

    await report_delivery_service._send_messages_platform(user_ids, report_id)

    mock_report_delivery_log_repository.bulk_create_logs.assert_called_once_with(
        recipient_ids=user_ids,
        report_id=report_id,
        method=DeliveryMethodEnum.PLATFORM,
        status="sent",
    )

@pytest.mark.asyncio
async def test_get_user_delivery_logs(report_delivery_service, mock_report_delivery_log_repository):
    user_id = uuid.uuid4()
    mock_report_delivery_log_repository.get_user_logs_paginated = AsyncMock(return_value=[])
    mock_report_delivery_log_repository.get_user_logs_count = AsyncMock(return_value=0)

    logs, pagination = await report_delivery_service.get_user_delivery_logs(user_id)

    assert logs == []
    assert pagination["total"] == 0
    mock_report_delivery_log_repository.get_user_logs_paginated.assert_called_once()
    mock_report_delivery_log_repository.get_user_logs_count.assert_called_once_with(user_id)

@pytest.mark.asyncio
async def test_get_user_received_reports(report_delivery_service, mock_report_delivery_log_repository):
    user_id = uuid.uuid4()
    mock_report_delivery_log_repository.get_user_received_reports_paginated = AsyncMock(return_value=([], 0))

    reports, pagination = await report_delivery_service.get_user_received_reports(user_id)

    assert reports == []
    assert pagination["total"] == 0
    mock_report_delivery_log_repository.get_user_received_reports_paginated.assert_called_once()
