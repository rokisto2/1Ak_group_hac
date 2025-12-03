import pytest
from unittest.mock import MagicMock, AsyncMock
from main_server.services.report_service import ReportService
from main_server.db.repositories import S3StorageRepository, ReportRepository
from fastapi import HTTPException
import uuid

@pytest.fixture
def mock_s3_storage_repository():
    return MagicMock(spec=S3StorageRepository)

@pytest.fixture
def mock_report_repository():
    return MagicMock(spec=ReportRepository)

@pytest.fixture
def report_service(mock_s3_storage_repository, mock_report_repository):
    return ReportService(
        storage_repo=mock_s3_storage_repository,
        report_repo=mock_report_repository,
    )

def test_report_service_init(report_service, mock_s3_storage_repository, mock_report_repository):
    assert report_service._storage == mock_s3_storage_repository
    assert report_service._repo == mock_report_repository

@pytest.mark.asyncio
async def test_generate_report_success(report_service, mock_s3_storage_repository, mock_report_repository):
    mock_s3_storage_repository.upload_file = AsyncMock()
    mock_report_repository.create_report = AsyncMock(return_value="report")

    report = await report_service.generate_report(
        file=b"file content",
        report_name="report.txt",
        set_report_name="My Report",
        user_id=uuid.uuid4(),
    )

    assert report == "report"
    mock_s3_storage_repository.upload_file.assert_called_once()
    mock_report_repository.create_report.assert_called_once()

@pytest.mark.asyncio
async def test_generate_report_upload_failed(report_service, mock_s3_storage_repository):
    mock_s3_storage_repository.upload_file = AsyncMock(side_effect=Exception("Upload failed"))

    with pytest.raises(HTTPException) as exc_info:
        await report_service.generate_report(
            file=b"file content",
            report_name="report.txt",
            set_report_name="My Report",
            user_id=uuid.uuid4(),
        )
    assert exc_info.value.status_code == 500
    assert "Report upload failed" in exc_info.value.detail

@pytest.mark.asyncio
async def test_get_user_reports_success(report_service, mock_report_repository):
    mock_report_repository.get_reports_by_user_id = AsyncMock(return_value=["report1", "report2"])
    user_id = uuid.uuid4()

    reports = await report_service.get_user_reports(user_id)

    assert reports == ["report1", "report2"]
    mock_report_repository.get_reports_by_user_id.assert_called_once_with(
        user_id=user_id, date_from=None, date_to=None
    )

@pytest.mark.asyncio
async def test_get_user_reports_failed(report_service, mock_report_repository):
    mock_report_repository.get_reports_by_user_id = AsyncMock(side_effect=Exception("Fetch failed"))
    user_id = uuid.uuid4()

    with pytest.raises(HTTPException) as exc_info:
        await report_service.get_user_reports(user_id)

    assert exc_info.value.status_code == 500
    assert "Failed to get user reports" in exc_info.value.detail
