from fastapi import APIRouter, Depends, HTTPException
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from fastapi import HTTPException, status
from main_server.api.schemas import UserCreate
from main_server.core.dependencies import get_email_scheduler, get_user_repository
from main_server.db.repositories import UserRepository

from main_server.services.email_schedule_send import EmailScheduleSend

router = APIRouter(prefix="/test", tags=["test"])

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

class EmailRequest(BaseModel):
    """Модель запроса для отправки тестового email."""
    to: EmailStr
    full_name: str
    login: str
    password: str

@router.post("/add_users", status_code=status.HTTP_201_CREATED)
async def init_manager(
        user_data: list[UserCreate],
        user_repository: UserRepository = Depends(get_user_repository),
):
    result = []
    for user in user_data:
        password_hash = pwd_ctx.hash(user.password)

        new_user = await user_repository.create_user(
            full_name=user.full_name,
            email=user.email,
            password_hash=password_hash,
            role=user.role
        )

        result.append( {"id": new_user.id, "email": user.email, "role": user.role, "password": user.password, "full_name": user.full_name})

    return result


# @router.post("/send-email", summary="Тестовая отправка email")
# async def test_send_email(
#         request: EmailRequest,
#         email_scheduler: EmailScheduleSend = Depends(get_email_scheduler)
# ):
#     """
#     Тестовый эндпоинт для отправки электронного сообщения.
#     """
#     # Проверка обязательных полей
#     if not request.full_name or not request.login or not request.password:
#         raise HTTPException(
#             status_code=400,
#             detail="Необходимо указать full_name, login и password"
#         )
#
#     await email_scheduler.schedule_registration_email(
#         email=request.to,
#         full_name=request.full_name,
#         login=request.login,
#         password=request.password,
#         delay_seconds=1
#     )
#     return {"status": "success", "message": "Email успешно отправлено"}