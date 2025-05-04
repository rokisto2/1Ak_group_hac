from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from datetime import datetime, timedelta
from jose import jwt

from main_server.core.dependencies import get_db_session, get_auth_service
from main_server.core.dictionir.ROLE import UserRoles
from main_server.api.schemas.user import (PasswordChange, TelegramBind, UserCreate, Token, UserCreateWithoutPassword)
from main_server.services import AuthService

from main_server.db.secret_config import secret_settings
jwt_settings = secret_settings
from main_server.core.dependencies import get_current_user, get_manager_user, create_access_token
# Используем настройки JWT
SECRET_KEY = jwt_settings.SECRET_KEY
ALGORITHM = jwt_settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = jwt_settings.ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")



# Вспомогательные функции
def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt




# Эндпоинты
@router.post("/login", response_model=Token)
async def login(
        form_data: OAuth2PasswordRequestForm = Depends(),
        auth_service: AuthService = Depends(get_auth_service)):
    user = await auth_service.login(form_data.username, form_data.password)

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user.id,
        "role": user.user_type
    }


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(
        user_data: UserCreateWithoutPassword,
        auth_service: AuthService = Depends(get_auth_service),
        admin_user=Depends(get_manager_user)
):
    user = await auth_service.register_user(
        email=user_data.email,
        full_name=user_data.full_name,
        password=None,
        role=user_data.role
    )
    return {"id": user.id, "email": user.email, "role": user.user_type}


@router.post("/telegram/generate")
async def generate_telegram_key(
        auth_service: AuthService = Depends(get_auth_service),
        current_user=Depends(get_current_user)
):
    key = await auth_service.generate_telegram_key(current_user.id)
    return {"key": key}


@router.post("/telegram/bind")
async def bind_telegram(
        data: TelegramBind,
        auth_service: AuthService = Depends(get_auth_service)
):
    user = await auth_service.bind_telegram(data.key, data.chat_id)
    user_id = user.id
    return {"success": True, "user_id": user_id}


from fastapi import HTTPException, status


@router.get("/telegram/is-bound", response_model=dict)
async def check_telegram_binding(
        auth_service: AuthService = Depends(get_auth_service),
        current_user=Depends(get_current_user)
):
    """
    Проверка наличия привязки аккаунта к Telegram боту

    Возвращает информацию о статусе привязки
    """
    is_bound, user = await auth_service.check_telegram_binding(current_user.id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )

    return {
        "is_bound": is_bound
    }


@router.post("/password/change")
async def change_password(
        data: PasswordChange,
        auth_service: AuthService = Depends(get_auth_service),
        current_user=Depends(get_current_user)
):
    result = await auth_service.change_password(
        user_id=current_user.id,
        old_password=data.old_password,
        new_password=data.new_password
    )
    return {"success": result}


