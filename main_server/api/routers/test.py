from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from main_server.core.dependencies import get_email_scheduler
from main_server.services.email_schedule_send import EmailScheduleSend

router = APIRouter(prefix="/test", tags=["test"])



class EmailRequest(BaseModel):
    """Модель запроса для отправки тестового email."""
    to: EmailStr
    full_name: str
    login: str
    password: str


@router.post("/send-email", summary="Тестовая отправка email")
async def test_send_email(
        request: EmailRequest,
        email_scheduler: EmailScheduleSend = Depends(get_email_scheduler)
):
    """
    Тестовый эндпоинт для отправки электронного сообщения.
    """
    # Проверка обязательных полей
    if not request.full_name or not request.login or not request.password:
        raise HTTPException(
            status_code=400,
            detail="Необходимо указать full_name, login и password"
        )

    await email_scheduler.schedule_registration_email(
        email=request.to,
        full_name=request.full_name,
        login=request.login,
        password=request.password,
        delay_seconds=1
    )
    return {"status": "success", "message": "Email успешно отправлено"}