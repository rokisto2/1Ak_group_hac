from io import BytesIO
from typing import Union, BinaryIO


class S3StorageRepository:
    def __init__(self, s3_client, bucket_name: str):
        self.client = s3_client
        self.bucket = bucket_name

    async def initialize(self):
        """Checked bucket exits"""
        try:
            await self.client.head_bucket(Bucket=self.bucket)
        except Exception as e:
            raise RuntimeError(f"Bucket {self.bucket} unavailable: {str(e)}")

    async def _bucket_exists(self) -> bool:
        """Checks if the bucket exists in the storage"""
        try:
            await self.client.head_bucket(Bucket=self.bucket)
            return True
        except Exception:
            return False

    async def upload_file(self, file_data: Union[bytes, BinaryIO], object_name: str) -> str:
        """
        Uploads a file to the storage

        Args:
            file_data: File data (bytes or file-like object)
            object_name: Object name in storage (can include path)

        Returns:
            str: Name of the uploaded object

        Raises:
            RuntimeError: If file upload fails
        """
        if isinstance(file_data, bytes):
            file_data = BytesIO(file_data)

        try:
            file_data.seek(0)
            await self.client.upload_fileobj(
                file_data,
                self.bucket,
                object_name
            )
            return object_name
        except Exception as exc:
            raise RuntimeError(f"Failed to upload file: {exc}")

    async def download_file(self, object_name: str) -> BytesIO:
        """
        Downloads a file from storage

        Args:
            object_name: Object name in storage

        Returns:
            BytesIO: File contents as byte stream

        Raises:
            RuntimeError: If file download fails
        """
        file_data = BytesIO()
        try:
            await self.client.download_fileobj(
                self.bucket,
                object_name,
                file_data
            )
            file_data.seek(0)
            return file_data
        except Exception as exc:
            raise RuntimeError(f"Failed to download file: {exc}")

    async def generate_presigned_url(self, object_name: str, expiration: int = 3600) -> str:
        """
        Generates a temporary download URL

        Args:
            object_name: Object name in storage
            expiration: URL expiration time in seconds (default: 1 hour)

        Returns:
            str: Temporary download URL

        Raises:
            RuntimeError: If URL generation fails
        """
        try:
            return await self.client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket,
                    'Key': object_name
                },
                ExpiresIn=expiration
            )
        except Exception as exc:
            raise RuntimeError(f"Failed to generate presigned URL: {exc}")

    async def generate_upload_url(self, object_name: str, expiration: int = 3600) -> str:
        """
        Generates a temporary upload URL

        Args:
            object_name: Object name in storage
            expiration: URL expiration time in seconds (default: 1 hour)

        Returns:
            str: Temporary upload URL

        Raises:
            RuntimeError: If URL generation fails
        """
        try:
            return await self.client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': self.bucket,
                    'Key': object_name
                },
                ExpiresIn=expiration
            )
        except Exception as exc:
            raise RuntimeError(f"Failed to generate upload URL: {exc}")

    async def delete_file(self, object_name: str) -> bool:
        """
        Deletes a file from storage

        Args:
            object_name: Object name in storage

        Returns:
            bool: True if deletion was successful

        Raises:
            RuntimeError: If file deletion fails
        """
        try:
            await self.client.delete_object(
                Bucket=self.bucket,
                Key=object_name
            )
            return True
        except Exception as exc:
            raise RuntimeError(f"Failed to delete file: {exc}")
