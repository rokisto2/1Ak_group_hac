from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, UUID
from datetime import datetime, timedelta
import secrets
from typing import Optional

from db.models import ActivationKey


class ActivationKeyRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def _generate_unique_key(self) -> str:
        """Генерирует уникальный ключ с проверкой коллизий."""
        while True:
            key = secrets.token_urlsafe(2)
            result = await self.session.execute(
                select(ActivationKey).where(ActivationKey.key == key)
            )
            if not result.scalar_one_or_none():
                return key

    async def key_exists(self, key: str) -> bool:
        """
        Проверяет существование ключа в базе.
        Более эффективная версия с LIMIT 1.
        """
        result = await self.session.execute(
            select(1)
            .where(ActivationKey.key == key)
            .limit(1)
        )
        return result.scalar() is not None

    async def upsert_key(
            self,
            user_id: UUID(as_uuid=True),
            expires_hours: int = 24,
            autocommit: bool = True
    ) -> ActivationKey:
        """
        Создает или обновляет ключ.
        :param autocommit: Если False, транзакцию нужно закоммитить вручную.
        """
        # Удаляем старый ключ пользователя
        await self.session.execute(
            delete(ActivationKey).where(ActivationKey.user_id == user_id)
        )

        # Создаем новый ключ
        key = await self._generate_unique_key()
        expires_at = datetime.utcnow() + timedelta(hours=expires_hours)

        new_key = ActivationKey(
            key=key,
            user_id=user_id,
            expires_at=expires_at,
        )
        self.session.add(new_key)

        if autocommit:
            await self.session.commit()
            # Явное получение ключа перед возвратом
            await self.session.refresh(new_key)

        return new_key


    async def cleanup_expired_keys(
            self,
            autocommit: bool = True
    ) -> int:
        """Удаляет истекшие ключи."""
        result = await self.session.execute(
            delete(ActivationKey).where(
                ActivationKey.expires_at < datetime.utcnow()
            )
        )

        if autocommit:
            await self.session.commit()
        return result.rowcount()