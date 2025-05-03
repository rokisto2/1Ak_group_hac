from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from datetime import datetime, timedelta
from jose import JWTError, jwt
from uuid import UUID

from core.dependencies import get_db_session, get_auth_service
from core.dictionir.ROLE import UserRoles
from schemas.user import (PasswordChange, TelegramBind, UserCreate, Token)
from services import AuthService

from db.secret_config import secret_settings
jwt_settings = secret_settings
from core.dependencies import get_current_user, get_manager_user, create_access_token
# Используем настройки JWT
SECRET_KEY = jwt_settings.SECRET_KEY
ALGORITHM = jwt_settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = jwt_settings.ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


# Pydantic модели


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
        user_data: UserCreate,
        auth_service: AuthService = Depends(get_auth_service),
        admin_user=Depends(get_manager_user)
):
    user = await auth_service.register_user(
        email=user_data.email,
        full_name=user_data.full_name,
        password=user_data.password,
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


@router.post("/init-manager", status_code=status.HTTP_201_CREATED)
async def init_manager(
        user_data: UserCreate,
        db: AsyncSession = Depends(get_db_session),
        auth_service: AuthService = Depends(get_auth_service)
):
    # Создаем менеджера
    user = await auth_service.register_user(
        email=user_data.email,
        full_name=user_data.full_name,
        password=user_data.password,
        role=UserRoles.MANAGER
    )

    return {"id": user.id, "email": user.email, "role": user.user_type}
