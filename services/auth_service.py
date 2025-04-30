import random
import string
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from db.repositories.user_repository import UserRepository
from db.repositories.activation_key_repository import ActivationKeyRepository
from db.models import User, ActivationKey
from core.dictionir.ROLE import UserRoles
from utils.email import send_registration_email
from passlib.context import CryptContext

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_repo = UserRepository(session)
        self.activation_key_repo = ActivationKeyRepository(session)

    def _generate_password(self, length=10) -> str:
        """Генерирует случайный пароль"""
        chars = string.ascii_letters + string.digits + "!@#$%^&*"
        return ''.join(random.choice(chars) for _ in range(length))

    async def register_user(self, email: str, full_name: str, password: Optional[str] = None,
                            role: str = UserRoles.USER):
        """Регистрация нового пользователя"""
        # Проверка на существование пользователя
        existing_user = await self.user_repo.get_by_email(email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь с такой почтой уже существует"
            )

        # Генерация пароля, если не указан
        if not password:
            password = self._generate_password()
            send_password = True
        else:
            send_password = False

        # Хеширование пароля
        password_hash = pwd_ctx.hash(password)

        # Создание пользователя
        user = await self.user_repo.create_user(
            full_name=full_name,
            email=email,
            password_hash=password_hash,
            role=role
        )

        # Отправка письма с данными
        if send_password:
            send_registration_email(
                to=email,
                full_name=full_name,
                login=email,
                password=password
            )

        return user

    async def login(self, email: str, password: str):
        """Аутентификация пользователя"""
        user = await self.user_repo.get_by_email(email)
        if not user or not pwd_ctx.verify(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Неверный email или пароль"
            )
        return user

    async def generate_telegram_key(self, user_id: UUID, expires_hours: int = 24):
        """Генерирует ключ для привязки Telegram аккаунта"""
        # Получение пользователя
        user = await self.user_repo.get(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден"
            )

        # Создание или обновление ключа активации
        activation_key = await self.activation_key_repo.upsert_key(
            user_id=user_id,
            expires_hours=expires_hours
        )

        return activation_key.key

    async def bind_telegram(self, key: str, chat_id: str):
        """Привязывает Telegram аккаунт к пользователю"""
        # Проверка существования ключа
        key_exists = await self.activation_key_repo.key_exists(key)
        if not key_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Неверный ключ активации или срок его действия истек"
            )

        # Получение ключа и связанного пользователя
        result = await self.session.execute(
            select(ActivationKey, User).join(User, ActivationKey.user_id == User.id)
            .where(ActivationKey.key == key)
        )
        activation_key, user = result.first()

        # Проверка срока действия
        if activation_key.expires_at < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Срок действия ключа истек"
            )

        # Проверка, не занят ли chat_id другим пользователем
        existing_user = await self.user_repo.get_by_telegram_id(chat_id)
        if existing_user and existing_user.id != user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Данный Telegram аккаунт уже привязан к другому пользователю"
            )

        # Обновление пользователя и удаление ключа
        await self.user_repo.update_user_info(user.id, chat_id=chat_id)
        await self.session.execute(
            delete(ActivationKey).where(ActivationKey.key == key)
        )
        await self.session.commit()

        return user

    async def change_password(self, user_id: UUID, old_password: str, new_password: str):
        """Изменение пароля пользователя"""
        user = await self.user_repo.get(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден"
            )

        if not pwd_ctx.verify(old_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Неправильный текущий пароль"
            )

        await self.user_repo.update_user_info(
            user_id=user_id,
            password_hash=pwd_ctx.hash(new_password)
        )

        return True