from datetime import datetime
from typing import List, Dict, Optional, Tuple
from uuid import UUID

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from api import auth
from api.auth import get_admin_user
from db.enums import DeliveryMethodEnum
from db.models import User, GeneratedReport
from services import ReportDeliveryService
from services.email_schedule_send import EmailScheduleSend
from services.report_service import ReportService
from core.dependencies import get_s3_storage_repository, get_report_repository, get_db_session, get_email_scheduler, \
    get_user_repository, get_report_delivery_log_repository
from db.repositories import ReportRepository, S3StorageRepository, UserRepository
from fastapi import WebSocket,WebSocketDisconnect

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
        email_scheduler: EmailScheduleSend = Depends(get_email_scheduler),
        s3_repository: S3StorageRepository = Depends(get_s3_storage_repository),
        report_repository: ReportRepository = Depends(get_report_repository),
        user_repository:UserRepository = Depends(get_user_repository),
        admin_user=Depends(get_admin_user),
        log_repository=Depends(get_report_delivery_log_repository)
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
        service = ReportDeliveryService(
            temp_files_dir="D:\\Programs\\JetBrain PyCharm\\Projects\\1Ak_group_hac\\temp_send",
            email_schedule_send=email_scheduler,
            s3_storage_repository=s3_repository,
            report_repository=report_repository,
            user_repository=user_repository,
            log_repository=log_repository
        )

        await service.send_report(
            sender_id=admin_user.id,
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

@router.get("/admin/reports", response_model=List[ReportResponse])
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

#
# class WebSocketManager:
#     def __init__(self):
#         self.active_connections: Dict[UUID, List[WebSocket]] = {}
#
#     async def connect(self, report_id: UUID, websocket: WebSocket):
#         await websocket.accept()
#         if report_id not in self.active_connections:
#             self.active_connections[report_id] = []
#         self.active_connections[report_id].append(websocket)
#
#     def disconnect(self, report_id: UUID, websocket: WebSocket):
#         if report_id in self.active_connections:
#             self.active_connections[report_id].remove(websocket)
#             if not self.active_connections[report_id]:
#                 del self.active_connections[report_id]
#
#     async def send_status_update(self, report_id: UUID, message: dict):
#         if report_id in self.active_connections:
#             for ws in self.active_connections[report_id]:
#                 await ws.send_json(message)
#
# ws_manager = WebSocketManager()
#
#
#
# @router.websocket("/ws/reports/{report_id}")
# async def websocket_endpoint(websocket: WebSocket, report_id: UUID):
#     await ws_manager.connect(report_id, websocket)
#     try:
#         while True:
#             await websocket.receive_text()  # держим соединение открытым
#     except WebSocketDisconnect:
#         ws_manager.disconnect(report_id, websocket)

