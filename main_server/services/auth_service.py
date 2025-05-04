import random
import string
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from main_server.db.models import User, ActivationKey
from main_server.core import UserRoles
# from utils.email import send_registration_email
from passlib.context import CryptContext

from main_server.db.repositories import UserRepository
from main_server.db.repositories import ActivationKeyRepository
from main_server.services.email_schedule_send import EmailScheduleSend

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    def __init__(self, session: AsyncSession,email_schedule_send:EmailScheduleSend):
        self.session = session
        self.user_repo = UserRepository(session)
        self.activation_key_repo = ActivationKeyRepository(session)
        self.email_schedule_send = email_schedule_send

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

        # Хеширование пароля
        password_hash = pwd_ctx.hash(password)

        # Создание пользователя
        user = await self.user_repo.create_user(
            full_name=full_name,
            email=email,
            password_hash=password_hash,
            role=role
        )


        # if send_password:
        await self.email_schedule_send.schedule_registration_email(
            email= email,
            full_name= full_name,
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

    async def reset_password(self, user_id: UUID) -> bool:
        """Сбрасывает пароль пользователя и отправляет новый на почту"""
        # Получаем пользователя
        user = await self.user_repo.get(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден"
            )

        # Генерируем новый пароль
        new_password = self._generate_password()

        # Хешируем пароль
        password_hash = pwd_ctx.hash(new_password)

        # Обновляем пароль пользователя
        await self.user_repo.update_user_info(
            user_id=user_id,
            password_hash=password_hash
        )

        # Отправляем уведомление о сбросе пароля
        await self.email_schedule_send.schedule_password_reset_notification(
            email=user.email,
            full_name=user.full_name,
            login=user.email,
            password=new_password
        )

        return True

    async def check_telegram_binding(self, user_id: UUID) -> tuple[bool, Optional[User]]:
        """
        Проверяет привязан ли аккаунт пользователя к телеграм-боту

        Args:
            user_id: ID пользователя

        Returns:
            Кортеж (статус привязки, chat_id телеграма)
        """
        user = await self.user_repo.get(user_id)
        if not user:
            return False,None

        return user.chat_id is not None, user

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

        key_value = activation_key.key

        return key_value

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

        # Проверка срока действия ключа
        current_time = datetime.utcnow()
        expires_at = activation_key.expires_at

        # Приводим обе даты к одному формату
        if expires_at.tzinfo:
            from datetime import timezone
            current_time = current_time.replace(tzinfo=timezone.utc)
        else:
            expires_at = expires_at.replace(tzinfo=None)

        if expires_at < current_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Срок действия ключа истек"
            )

        # Извлечение ID пользователя сразу, чтобы не обращаться к нему позже
        user_id = user.id

        # Проверка, не занят ли chat_id другим пользователем
        existing_user = await self.user_repo.get_by_telegram_id(chat_id)
        if existing_user and existing_user.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Данный Telegram аккаунт уже привязан к другому пользователю"
            )

        # Обновление пользователя и удаление ключа
        await self.user_repo.update_user_info(user_id, chat_id=chat_id)
        await self.session.execute(
            delete(ActivationKey).where(ActivationKey.key == key)
        )
        await self.session.commit()

        # Явно загружаем обновленного пользователя перед возвратом
        updated_user = await self.user_repo.get(user_id)
        return updated_user

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