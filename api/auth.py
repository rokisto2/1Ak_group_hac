from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from datetime import datetime, timedelta
from jose import JWTError, jwt
from uuid import UUID

from core.dependencies import get_db_session
from services.auth_service import AuthService
from core.dictionir.ROLE import UserRoles
from schemas.user import (PasswordChange, TelegramBind, UserCreate, Token)

# Настройки JWT
#TODO: Добавить потом чтение SECRET_KEY из env
SECRET_KEY = "11111"  # В реальном проекте брать из настроек
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


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


async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db_session)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Недействительные учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    auth_service = AuthService(db)
    user = await auth_service.user_repo.get(UUID(user_id))
    if user is None:
        raise credentials_exception
    return user


async def get_admin_user(user=Depends(get_current_user)):
    if user.user_type not in [UserRoles.SUPERUSER, UserRoles.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав доступа"
        )
    return user


# Эндпоинты
@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db_session)):
    auth_service = AuthService(db)
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
        db: AsyncSession = Depends(get_db_session),
        admin_user=Depends(get_admin_user)
):
    auth_service = AuthService(db)
    user = await auth_service.register_user(
        email=user_data.email,
        full_name=user_data.full_name,
        password=user_data.password,
        role=user_data.role
    )
    return {"id": user.id, "email": user.email, "role": user.user_type}


@router.post("/telegram/generate")
async def generate_telegram_key(
        db: AsyncSession = Depends(get_db_session),
        current_user=Depends(get_current_user)
):
    auth_service = AuthService(db)
    key = await auth_service.generate_telegram_key(current_user.id)
    return {"key": key}


@router.post("/telegram/bind")
async def bind_telegram(
        data: TelegramBind,
        db: AsyncSession = Depends(get_db_session)
):
    auth_service = AuthService(db)
    user = await auth_service.bind_telegram(data.key, data.chat_id)
    return {"success": True, "user_id": user.id}


@router.post("/password/change")
async def change_password(
        data: PasswordChange,
        db: AsyncSession = Depends(get_db_session),
        current_user=Depends(get_current_user)
):
    auth_service = AuthService(db)
    result = await auth_service.change_password(
        user_id=current_user.id,
        old_password=data.old_password,
        new_password=data.new_password
    )
    return {"success": result}


@router.post("/init-superuser", status_code=status.HTTP_201_CREATED)
async def init_superuser(
        user_data: UserCreate,
        db: AsyncSession = Depends(get_db_session)
):
    # Проверяем, что в системе еще нет суперпользователей
    auth_service = AuthService(db)
    superusers = await auth_service.user_repo.get_superusers()

    if superusers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Суперпользователь уже существует"
        )

    # Создаем суперпользователя
    user = await auth_service.register_user(
        email=user_data.email,
        full_name=user_data.full_name,
        password=user_data.password,
        role=UserRoles.SUPERUSER
    )

    return {"id": user.id, "email": user.email, "role": user.user_type}
