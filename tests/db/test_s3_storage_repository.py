import pytest
from io import BytesIO
from unittest.mock import AsyncMock, MagicMock, patch
from main_server.db.repositories.s3_storage_repository import S3StorageRepository


@pytest.fixture
def mock_s3_client():
    """Creates a mock S3 client for testing"""
    client = AsyncMock()
    # Mock successful head_bucket by default
    client.head_bucket = AsyncMock(return_value=True)
    client.upload_fileobj = AsyncMock(return_value=None)
    client.download_fileobj = AsyncMock(return_value=None)
    client.generate_presigned_url = AsyncMock(return_value="https://example.com/presigned-url")
    client.delete_object = AsyncMock(return_value=None)
    return client


@pytest.fixture
def s3_repository(mock_s3_client):
    """Creates S3StorageRepository instance with mocked client"""
    return S3StorageRepository(s3_client=mock_s3_client, bucket_name="test-bucket")


@pytest.mark.asyncio
async def test_initialize_success(s3_repository, mock_s3_client):
    """Test successful bucket initialization"""
    mock_s3_client.head_bucket.return_value = True

    # Should not raise any exception
    await s3_repository.initialize()

    mock_s3_client.head_bucket.assert_called_once_with(Bucket="test-bucket")


@pytest.mark.asyncio
async def test_initialize_failure(mock_s3_client):
    """Test initialization failure when bucket doesn't exist"""
    mock_s3_client.head_bucket.side_effect = Exception("Bucket not found")
    repository = S3StorageRepository(s3_client=mock_s3_client, bucket_name="non-existent-bucket")

    with pytest.raises(RuntimeError, match="Bucket non-existent-bucket unavailable"):
        await repository.initialize()


@pytest.mark.asyncio
async def test_bucket_exists_true(s3_repository, mock_s3_client):
    """Test _bucket_exists returns True when bucket exists"""
    mock_s3_client.head_bucket.return_value = True

    result = await s3_repository._bucket_exists()

    assert result is True
    mock_s3_client.head_bucket.assert_called_once_with(Bucket="test-bucket")


@pytest.mark.asyncio
async def test_bucket_exists_false(s3_repository, mock_s3_client):
    """Test _bucket_exists returns False when bucket doesn't exist"""
    mock_s3_client.head_bucket.side_effect = Exception("Bucket not found")

    result = await s3_repository._bucket_exists()

    assert result is False


@pytest.mark.asyncio
async def test_upload_file_with_bytes(s3_repository, mock_s3_client):
    """Test uploading file from bytes"""
    file_data = b"Test file content"
    object_name = "test-folder/test-file.txt"

    result = await s3_repository.upload_file(file_data, object_name)

    assert result == object_name
    mock_s3_client.upload_fileobj.assert_called_once()

    # Verify the call arguments
    call_args = mock_s3_client.upload_fileobj.call_args
    assert call_args[0][1] == "test-bucket"
    assert call_args[0][2] == object_name

    # Verify the file data is a BytesIO object
    file_obj = call_args[0][0]
    assert isinstance(file_obj, BytesIO)
    assert file_obj.read() == file_data


@pytest.mark.asyncio
async def test_upload_file_with_bytesio(s3_repository, mock_s3_client):
    """Test uploading file from BytesIO object"""
    file_content = b"Test BytesIO content"
    file_data = BytesIO(file_content)
    object_name = "uploads/bytesio-file.txt"

    result = await s3_repository.upload_file(file_data, object_name)

    assert result == object_name
    mock_s3_client.upload_fileobj.assert_called_once()


@pytest.mark.asyncio
async def test_upload_file_failure(s3_repository, mock_s3_client):
    """Test upload_file raises RuntimeError on failure"""
    mock_s3_client.upload_fileobj.side_effect = Exception("Upload failed")
    file_data = b"Test content"

    with pytest.raises(RuntimeError, match="Failed to upload file"):
        await s3_repository.upload_file(file_data, "failed-upload.txt")


@pytest.mark.asyncio
async def test_download_file_success(s3_repository, mock_s3_client):
    """Test downloading file successfully"""
    # Mock the download to write data to the BytesIO object
    expected_content = b"Downloaded file content"

    async def mock_download(bucket, key, file_obj):
        file_obj.write(expected_content)

    mock_s3_client.download_fileobj = AsyncMock(side_effect=mock_download)
    object_name = "downloads/test-file.txt"

    result = await s3_repository.download_file(object_name)

    assert isinstance(result, BytesIO)
    assert result.read() == expected_content
    mock_s3_client.download_fileobj.assert_called_once_with(
        "test-bucket",
        object_name,
        result
    )


@pytest.mark.asyncio
async def test_download_file_failure(s3_repository, mock_s3_client):
    """Test download_file raises RuntimeError on failure"""
    mock_s3_client.download_fileobj.side_effect = Exception("File not found")

    with pytest.raises(RuntimeError, match="Failed to download file"):
        await s3_repository.download_file("non-existent-file.txt")


@pytest.mark.asyncio
async def test_generate_presigned_url_success(s3_repository, mock_s3_client):
    """Test generating presigned download URL"""
    expected_url = "https://s3.example.com/test-bucket/file.pdf?signature=xyz"
    mock_s3_client.generate_presigned_url.return_value = expected_url
    object_name = "documents/file.pdf"
    expiration = 7200

    result = await s3_repository.generate_presigned_url(object_name, expiration)

    assert result == expected_url
    mock_s3_client.generate_presigned_url.assert_called_once_with(
        'get_object',
        Params={
            'Bucket': 'test-bucket',
            'Key': object_name
        },
        ExpiresIn=expiration
    )


@pytest.mark.asyncio
async def test_generate_presigned_url_default_expiration(s3_repository, mock_s3_client):
    """Test generating presigned URL with default expiration"""
    expected_url = "https://s3.example.com/presigned"
    mock_s3_client.generate_presigned_url.return_value = expected_url

    result = await s3_repository.generate_presigned_url("file.txt")

    assert result == expected_url
    # Verify default expiration of 3600 seconds (1 hour)
    call_args = mock_s3_client.generate_presigned_url.call_args
    assert call_args[1]['ExpiresIn'] == 3600


@pytest.mark.asyncio
async def test_generate_presigned_url_failure(s3_repository, mock_s3_client):
    """Test generate_presigned_url raises RuntimeError on failure"""
    mock_s3_client.generate_presigned_url.side_effect = Exception("URL generation failed")

    with pytest.raises(RuntimeError, match="Failed to generate presigned URL"):
        await s3_repository.generate_presigned_url("file.txt")


@pytest.mark.asyncio
async def test_generate_upload_url_success(s3_repository, mock_s3_client):
    """Test generating presigned upload URL"""
    expected_url = "https://s3.example.com/upload-url?signature=abc"
    mock_s3_client.generate_presigned_url.return_value = expected_url
    object_name = "uploads/new-file.pdf"
    expiration = 1800

    result = await s3_repository.generate_upload_url(object_name, expiration)

    assert result == expected_url
    mock_s3_client.generate_presigned_url.assert_called_once_with(
        'put_object',
        Params={
            'Bucket': 'test-bucket',
            'Key': object_name
        },
        ExpiresIn=expiration
    )


@pytest.mark.asyncio
async def test_generate_upload_url_default_expiration(s3_repository, mock_s3_client):
    """Test generating upload URL with default expiration"""
    expected_url = "https://s3.example.com/upload"
    mock_s3_client.generate_presigned_url.return_value = expected_url

    result = await s3_repository.generate_upload_url("upload.txt")

    assert result == expected_url
    # Verify default expiration of 3600 seconds
    call_args = mock_s3_client.generate_presigned_url.call_args
    assert call_args[1]['ExpiresIn'] == 3600


@pytest.mark.asyncio
async def test_generate_upload_url_failure(s3_repository, mock_s3_client):
    """Test generate_upload_url raises RuntimeError on failure"""
    mock_s3_client.generate_presigned_url.side_effect = Exception("Upload URL generation failed")

    with pytest.raises(RuntimeError, match="Failed to generate upload URL"):
        await s3_repository.generate_upload_url("file.txt")


@pytest.mark.asyncio
async def test_delete_file_success(s3_repository, mock_s3_client):
    """Test deleting file successfully"""
    object_name = "files-to-delete/old-file.txt"

    result = await s3_repository.delete_file(object_name)

    assert result is True
    mock_s3_client.delete_object.assert_called_once_with(
        Bucket="test-bucket",
        Key=object_name
    )


@pytest.mark.asyncio
async def test_delete_file_failure(s3_repository, mock_s3_client):
    """Test delete_file raises RuntimeError on failure"""
    mock_s3_client.delete_object.side_effect = Exception("Delete failed")

    with pytest.raises(RuntimeError, match="Failed to delete file"):
        await s3_repository.delete_file("file-to-delete.txt")


@pytest.mark.asyncio
async def test_upload_file_with_special_characters(s3_repository, mock_s3_client):
    """Test uploading file with special characters in name"""
    file_data = b"Content with special name"
    object_name = "folder/файл-тест (2024).pdf"

    result = await s3_repository.upload_file(file_data, object_name)

    assert result == object_name
    mock_s3_client.upload_fileobj.assert_called_once()


@pytest.mark.asyncio
async def test_upload_and_download_cycle(s3_repository, mock_s3_client):
    """Test complete upload and download cycle"""
    file_content = b"Test cycle content"
    object_name = "cycle/test-file.bin"

    # Upload
    upload_result = await s3_repository.upload_file(file_content, object_name)
    assert upload_result == object_name

    # Mock download to return the same content
    async def mock_download(bucket, key, file_obj):
        file_obj.write(file_content)

    mock_s3_client.download_fileobj = AsyncMock(side_effect=mock_download)

    # Download
    downloaded_data = await s3_repository.download_file(object_name)
    assert downloaded_data.read() == file_content


@pytest.mark.asyncio
async def test_multiple_operations_on_same_file(s3_repository, mock_s3_client):
    """Test multiple operations on the same file"""
    file_content = b"Multi-operation file"
    object_name = "multi-op/file.txt"

    # Upload
    await s3_repository.upload_file(file_content, object_name)

    # Generate download URL
    download_url = await s3_repository.generate_presigned_url(object_name)
    assert download_url is not None

    # Generate upload URL (for updating)
    upload_url = await s3_repository.generate_upload_url(object_name)
    assert upload_url is not None

    # Delete
    delete_result = await s3_repository.delete_file(object_name)
    assert delete_result is True


@pytest.mark.asyncio
async def test_upload_empty_file(s3_repository, mock_s3_client):
    """Test uploading an empty file"""
    file_data = b""
    object_name = "empty/empty-file.txt"

    result = await s3_repository.upload_file(file_data, object_name)

    assert result == object_name
    mock_s3_client.upload_fileobj.assert_called_once()


@pytest.mark.asyncio
async def test_upload_large_file_name(s3_repository, mock_s3_client):
    """Test uploading file with very long name"""
    file_data = b"Content"
    # Create a long object name
    object_name = "folder/" + "a" * 200 + ".txt"

    result = await s3_repository.upload_file(file_data, object_name)

    assert result == object_name


@pytest.mark.asyncio
async def test_repository_with_different_bucket(mock_s3_client):
    """Test repository works with different bucket names"""
    custom_bucket = "custom-test-bucket"
    repository = S3StorageRepository(s3_client=mock_s3_client, bucket_name=custom_bucket)

    await repository.initialize()

    mock_s3_client.head_bucket.assert_called_with(Bucket=custom_bucket)


@pytest.mark.asyncio
async def test_file_seek_position_after_upload(s3_repository, mock_s3_client):
    """Test that file position is reset to 0 before upload"""
    file_content = b"Seek position test"
    file_data = BytesIO(file_content)

    # Move to end of file
    file_data.seek(0, 2)
    assert file_data.tell() == len(file_content)

    await s3_repository.upload_file(file_data, "seek-test.txt")

    # Verify upload was called and file was seeked to beginning
    mock_s3_client.upload_fileobj.assert_called_once()


@pytest.mark.asyncio
async def test_download_file_seek_position(s3_repository, mock_s3_client):
    """Test that downloaded file is seeked to beginning"""
    expected_content = b"Download seek test"

    async def mock_download(bucket, key, file_obj):
        file_obj.write(expected_content)

    mock_s3_client.download_fileobj = AsyncMock(side_effect=mock_download)

    result = await s3_repository.download_file("test.txt")

    # File should be at position 0
    assert result.tell() == 0
    assert result.read() == expected_content

