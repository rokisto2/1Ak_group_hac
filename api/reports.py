from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from services.report_service import ReportService
from core.dependencies import get_s3_storage_repository, get_report_repository
from db.repositories import ReportRepository, S3StorageRepository

router = APIRouter(prefix="/reports")

@router.post("/")
async def create_report(
    excel_file: UploadFile = File(...),
    template_file: UploadFile = File(...),
    report_name: str = "Generated Report",
    storage_repo: S3StorageRepository = Depends(get_s3_storage_repository),
    report_repo: ReportRepository = Depends(get_report_repository),
):
    """Create new report"""
    service = ReportService(storage_repo, report_repo)
    try:
        return await service.generate_report(
            excel_data=await excel_file.read(),
            template_data=await template_file.read(),
            report_name=report_name,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, detail=str(e))