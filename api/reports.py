from typing import List,Dict
from uuid import UUID

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from api import auth
from db.enums import DeliveryMethodEnum
from db.models import User
from services import ReportDeliveryService
from services.report_service import ReportService
from core.dependencies import get_s3_storage_repository, get_report_repository, get_db_session
from db.repositories import ReportRepository, S3StorageRepository
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
    user_id: UUID
    report_id: UUID
    delivery_methods: List[DeliveryMethodEnum]

@router.post("/reports/send")
async def send_report_to_user(request: SendReportRequest, session: AsyncSession = Depends(get_db_session)):
    service = ReportDeliveryService(session)
    try:
        result = await service.send_report(
            user_id=request.user_id,
            report_id=request.report_id,
            delivery_methods=request.delivery_methods
        )
        return {"status": "processing", "details": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[UUID, List[WebSocket]] = {}

    async def connect(self, report_id: UUID, websocket: WebSocket):
        await websocket.accept()
        if report_id not in self.active_connections:
            self.active_connections[report_id] = []
        self.active_connections[report_id].append(websocket)

    def disconnect(self, report_id: UUID, websocket: WebSocket):
        if report_id in self.active_connections:
            self.active_connections[report_id].remove(websocket)
            if not self.active_connections[report_id]:
                del self.active_connections[report_id]

    async def send_status_update(self, report_id: UUID, message: dict):
        if report_id in self.active_connections:
            for ws in self.active_connections[report_id]:
                await ws.send_json(message)

ws_manager = WebSocketManager()



@router.websocket("/ws/reports/{report_id}")
async def websocket_endpoint(websocket: WebSocket, report_id: UUID):
    await ws_manager.connect(report_id, websocket)
    try:
        while True:
            await websocket.receive_text()  # держим соединение открытым
    except WebSocketDisconnect:
        ws_manager.disconnect(report_id, websocket)

