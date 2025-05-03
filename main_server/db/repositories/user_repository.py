from sqlalchemy import select, func
from main_server.db.models import User
from .base_repository import BaseRepository
from main_server.core import UserRoles
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID


class UserRepository(BaseRepository):
    def __init__(self, db: AsyncSession):
        super().__init__(db)
        self.model = User

    async def get_users_by_ids(self, user_ids: list[UUID]) -> list[User]:
        """Получить список пользователей по их ID"""
        result = await self.db.execute(
            select(self.model)
            .where(self.model.id.in_(user_ids))
        )
        return result.scalars().all()

    async def get_users_by_roles(self, roles: list[str], offset: int = 0, limit: int = 10):
        """Получить пользователей по списку ролей с сортировкой по ФИО"""
        result = await self.db.execute(
            select(self.model)
            .where(self.model.user_type.in_(roles))
            .order_by(self.model.full_name)
            .offset(offset)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_count_by_roles(self, roles: list[str]) -> int:
        """Получить количество пользователей с указанными ролями"""
        result = await self.db.execute(
            select(func.count()).where(User.user_type.in_(roles))
        )
        return result.scalar_one()

    async def get_by_telegram_id(self, chat_id):
        """Получить пользователя по chat_id"""
        result = await self.db.execute(
            select(self.model).where(self.model.chat_id == chat_id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email):
        """Получить пользователя по email"""
        result = await self.db.execute(
            select(self.model).where(self.model.email == email)
        )
        return result.scalar_one_or_none()

    async def get_superusers(self):
        """Получить всех суперпользователей"""
        result = await self.db.execute(
            select(self.model).where(self.model.user_type == UserRoles.SUPERUSER)
        )
        return result.scalars().all()

    async def get_all(self):
        """Получить всех пользователей"""
        result = await self.db.execute(select(self.model))
        return result.scalars().all()

    async def deactivate_user(self, user_id):
        """Деактивировать пользователя"""
        user = await self.get(user_id)
        if user:
            user.is_active = 0
            self.db.add(user)
            await self.db.commit()
            return user
        return None

    async def activate_user(self, user_id):
        """Активировать пользователя"""
        user = await self.get(user_id)
        if user:
            user.is_active = 1
            self.db.add(user)
            await self.db.commit()
            return user
        return None

    async def change_role(self, user_id, new_role):
        """Изменить роль пользователя"""
        user = await self.get(user_id)
        if user:
            user.user_type = new_role
            self.db.add(user)
            await self.db.commit()
            await self.db.refresh(user)
            return user
        return None

    async def create_user(self, full_name, email, password_hash, chat_id=None, role=UserRoles.USER):
        """Создать нового пользователя"""
        user = User(
            email=email,
            full_name=full_name,
            password_hash=password_hash,
            chat_id=chat_id,
            user_type=role
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update_user_info(self, user_id, **kwargs):
        """Обновить информацию о пользователе"""
        user = await self.get(user_id)
        if not user:
            return None

        # Обновляем только переданные поля
        for key, value in kwargs.items():
            if hasattr(user, key):
                setattr(user, key, value)

        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

