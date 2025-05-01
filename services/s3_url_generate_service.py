from fastapi import HTTPException
from db.repositories import S3StorageRepository


class S3UrlGenerateService:
    def __init__(self, storage_repo: S3StorageRepository):
        self._storage = storage_repo

    async def generate_download_url(self, object_key: str, expiration: int = 3600) -> str:
        """
        Generate a temporary download URL for an S3 object.
        """
        try:
            return await self._storage.generate_presigned_url(object_key, expiration)
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate presigned download URL: {exc}"
            )

    async def generate_upload_url(self, object_key: str, expiration: int = 3600) -> str:
        """
        Generate a temporary upload URL for an S3 object.
        """
        try:
            return await self._storage.generate_upload_url(object_key, expiration)
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate presigned upload URL: {exc}"
            )
