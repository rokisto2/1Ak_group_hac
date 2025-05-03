from fastapi import Query, APIRouter, Depends

from main_server.core.dependencies import get_s3_storage_repository
from main_server.db.repositories import S3StorageRepository
from main_server.services.s3_url_generate_service import S3UrlGenerateService

router = APIRouter(prefix="/url-generate")

@router.get("/download")
async def get_download_url(
    object_key: str = Query(..., description="S3 object key to download"),
    s3_storage_repo: S3StorageRepository = Depends(get_s3_storage_repository)
):
    service = S3UrlGenerateService(s3_storage_repo)
    url = await service.generate_download_url(object_key, 15*60)
    return {"url": url}