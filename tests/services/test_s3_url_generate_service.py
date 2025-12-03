import pytest
from unittest.mock import MagicMock, AsyncMock
from main_server.services.s3_url_generate_service import S3UrlGenerateService
from main_server.db.repositories import S3StorageRepository
from fastapi import HTTPException

@pytest.fixture
def mock_s3_storage_repository():
    return MagicMock(spec=S3StorageRepository)

@pytest.fixture
def s3_url_generate_service(mock_s3_storage_repository):
    return S3UrlGenerateService(storage_repo=mock_s3_storage_repository)

def test_s3_url_generate_service_init(s3_url_generate_service, mock_s3_storage_repository):
    assert s3_url_generate_service._storage == mock_s3_storage_repository

@pytest.mark.asyncio
async def test_generate_download_url_success(s3_url_generate_service, mock_s3_storage_repository):
    mock_s3_storage_repository.generate_presigned_url = AsyncMock(return_value="download_url")

    url = await s3_url_generate_service.generate_download_url("some_key")

    assert url == "download_url"
    mock_s3_storage_repository.generate_presigned_url.assert_called_once_with("some_key", 3600)

@pytest.mark.asyncio
async def test_generate_download_url_failure(s3_url_generate_service, mock_s3_storage_repository):
    mock_s3_storage_repository.generate_presigned_url = AsyncMock(side_effect=Exception("S3 error"))

    with pytest.raises(HTTPException) as exc_info:
        await s3_url_generate_service.generate_download_url("some_key")

    assert exc_info.value.status_code == 500
    assert "Failed to generate presigned download URL" in exc_info.value.detail

@pytest.mark.asyncio
async def test_generate_upload_url_success(s3_url_generate_service, mock_s3_storage_repository):
    mock_s3_storage_repository.generate_upload_url = AsyncMock(return_value="upload_url")

    url = await s3_url_generate_service.generate_upload_url("some_key")

    assert url == "upload_url"
    mock_s3_storage_repository.generate_upload_url.assert_called_once_with("some_key", 3600)

@pytest.mark.asyncio
async def test_generate_upload_url_failure(s3_url_generate_service, mock_s3_storage_repository):
    mock_s3_storage_repository.generate_upload_url = AsyncMock(side_effect=Exception("S3 error"))

    with pytest.raises(HTTPException) as exc_info:
        await s3_url_generate_service.generate_upload_url("some_key")

    assert exc_info.value.status_code == 500
    assert "Failed to generate presigned upload URL" in exc_info.value.detail
