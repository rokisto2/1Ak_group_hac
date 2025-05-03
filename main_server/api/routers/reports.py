from datetime import datetime
from typing import List, Optional, Tuple
from uuid import UUID

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from pydantic import BaseModel

from main_server.api.routers import auth
from main_server.core.dictionir import DeliveryMethodEnum
from main_server.db.models import User, GeneratedReport
from main_server.services import ReportDeliveryService
from main_server.services.report_service import ReportService
from main_server.core.dependencies import get_s3_storage_repository, get_report_repository, get_report_delivery_service, \
    get_admin_user
from main_server.db.repositories import ReportRepository, S3StorageRepository

router = APIRouter(prefix="/reports")

@router.post("/")
async def create_report(
    excel_file: UploadFile = File(...),
    template_file: UploadFile = File(...),
    report_name: str = "Generated Report",
    storage_repo: S3StorageRepository = Depends(get_s3_storage_repository),
    report_repo: ReportRepository = Depends(get_report_repository),
    current_user: User = Depends(auth.get_current_user),
):
    """Create new report"""
    service = ReportService(storage_repo, report_repo)
    try:
        return await service.generate_report(
            excel_data=await excel_file.read(),
            template_data=await template_file.read(),
            report_name=report_name,
            user_id=current_user.id,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, detail=str(e))


class SendReportRequest(BaseModel):
    """
    Модель запроса для отправки отчета пользователям

    Attributes:
        report_id: UUID отчета для отправки
        users_info: Список получателей и методов доставки, где каждый элемент - это
                   кортеж (user_id, список_методов_доставки)
    """
    report_id: UUID
    users_info: List[Tuple[UUID, List[DeliveryMethodEnum]]]

    class Config:
        json_schema_extra = {
            "example": {
                "report_id": "a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8",
                "users_info": [
                    ["a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8", ["email", "platform"]],
                    ["b2c3d4e5-f6g7-8901-h2i3-j4k5l6m7n8o9", ["telegram"]]
                ]
            }
        }


@router.post("/send")
async def send_report_to_user(
        request: SendReportRequest,
        service: ReportDeliveryService=Depends(get_report_delivery_service),
        admin_user = Depends(get_admin_user)
):
    """
    Отправляет отчет пользователям указанными способами.

    Параметры:
    - sender_id: ID пользователя, инициировавшего отправку
    - report_id: ID отчета для отправки
    - users_info: Список кортежей (user_id, delivery_methods)
                  где delivery_methods - список методов доставки
    """
    try:
        await service.send_report(
            report_id=request.report_id,
            users_info=request.users_info
        )

        return {"Status": "success", "message": "Report sent successfully"}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error occurred: {str(e)}"
        )


class ReportResponse(BaseModel):
    id: UUID
    report_name: str
    report_url: str
    excel_url: str
    template_url: str
    generated_at: datetime

    @classmethod
    def from_orm(cls, report: GeneratedReport):
        return cls(
            id=report.id,
            report_name=report.report_name,
            report_url=report.report_url,
            excel_url=report.excel_url,
            template_url=report.template_url,
            generated_at=report.generated_at
        )

@router.get("/admin", response_model=List[ReportResponse])
async def get_admin_reports(
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        admin_user: User = Depends(get_admin_user),
        s3_storage_repository: S3StorageRepository = Depends(get_s3_storage_repository),
        report_repository: ReportRepository = Depends(get_report_repository),
):
    """
    Получает список всех отчетов, сгенерированных администратором

    Параметры:
    - date_from: Начальная дата фильтрации (опционально)
    - date_to: Конечная дата фильтрации (опционально)

    Возвращает:
    - Список отчетов в формате ReportResponse
    """

    report_service = ReportService(s3_storage_repository,report_repository)
    try:
        reports = await report_service.get_user_reports(
            user_id=admin_user.id,
            date_from=date_from,
            date_to=date_to
        )
        return [ReportResponse.from_orm(report) for report in reports]
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get admin reports: {str(e)}"
        )


class ReceivedReportModel(BaseModel):
    report_url: str
    sender_name: str
    report_name: str
    delivered_at: datetime
    delivery_method: DeliveryMethodEnum


class PaginatedReportsResponse(BaseModel):
    items: List[ReceivedReportModel]
    pagination: dict


@router.get("/user/received-reports", response_model=PaginatedReportsResponse)
async def get_user_received_reports(
        page: int = 1,
        per_page: int = 10,
        current_user: User = Depends(auth.get_current_user),
        service: ReportDeliveryService = Depends(get_report_delivery_service)
):
    """
    Получает список отчетов, доставленных текущему пользователю с пагинацией.

    Параметры:
    - page: номер страницы (начиная с 1)
    - per_page: количество записей на странице

    Возвращает:
    - items: список отчетов с информацией о URL, отправителе и методах доставки
    - pagination: информация о пагинации
    """
    try:
        reports_list, pagination_data = await service.get_user_received_reports(
            user_id=current_user.id,
            page=page,
            per_page=per_page
        )

        return {
            "items": reports_list,
            "pagination": pagination_data
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Не удалось получить отчеты: {str(e)}"
        )

# get_user_delivery_logs

# @router.get("/user", response_model=List[ReportResponse])
# async def get_admin_reports(
#         date_from: Optional[datetime] = None,
#         date_to: Optional[datetime] = None,
#         user: User = Depends(get_current_user),
#         s3_storage_repository: S3StorageRepository = Depends(get_s3_storage_repository),
#         report_repository: ReportRepository = Depends(get_report_repository),
# ):
#     """
#     Получает список всех отчетов, сгенерированных администратором
#
#     Параметры:
#     - date_from: Начальная дата фильтрации (опционально)
#     - date_to: Конечная дата фильтрации (опционально)
#
#     Возвращает:
#     - Список отчетов в формате ReportResponse
#     """
#
#     report_service = ReportDeliveryService()
#     try:
#         reports = await report_service.get_user_reports(
#             user_id=admin_user.id,
#             date_from=date_from,
#             date_to=date_to
#         )
#         return [ReportResponse.from_orm(report) for report in reports]
#     except Exception as e:
#         raise HTTPException(
#             status_code=500,
#             detail=f"Failed to get admin reports: {str(e)}"
#         )

