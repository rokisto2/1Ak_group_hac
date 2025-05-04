from typing import Optional

from sqlalchemy import select, func, and_
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
        """Получить список незабаненных пользователей по их ID"""
        result = await self.db.execute(
            select(self.model)
            .where(
                and_(
                    self.model.id.in_(user_ids),
                    self.model.is_banned == False
                )
            )
        )
        return result.scalars().all()

    async def get_users_by_roles(self, roles: list[str], offset: int = 0, limit: int = 10, is_banned=False):
        """
        Получить пользователей по списку ролей с сортировкой по ФИО

        :param roles: список ролей для фильтрации
        :param offset: смещение для пагинации
        :param limit: лимит записей для пагинации
        :param is_banned: если False - только незабаненные, если True - все пользователи
        """
        query = select(self.model).where(self.model.user_type.in_(roles))

        # Применяем фильтр по бану только если is_banned=False
        if is_banned == False:
            query = query.where(self.model.is_banned == False)

        # Добавляем сортировку и пагинацию
        query = query.order_by(self.model.full_name).offset(offset).limit(limit)

        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_count_by_roles(self, roles: list[str], is_banned=False) -> int:
        """
        Получить количество пользователей с указанными ролями

        :param roles: список ролей для фильтрации
        :param is_banned: если False - только незабаненные, если True - все пользователи
        """
        query = select(func.count()).where(User.user_type.in_(roles))

        # Применяем фильтр по бану только если is_banned=False
        if is_banned == False:
            query = query.where(User.is_banned == False)

        result = await self.db.execute(query)
        return result.scalar_one()

    async def get_by_telegram_id(self, chat_id):
        """Получить незабаненного пользователя по chat_id"""
        result = await self.db.execute(
            select(self.model).where(
                and_(
                    self.model.chat_id == chat_id,
                    self.model.is_banned == False
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email):
        """Получить незабаненного пользователя по email"""
        result = await self.db.execute(
            select(self.model).where(
                and_(
                    self.model.email == email,
                    self.model.is_banned == False
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_superusers(self):
        """Получить всех незабаненных суперпользователей"""
        result = await self.db.execute(
            select(self.model).where(
                and_(
                    self.model.user_type == UserRoles.SUPERUSER,
                    self.model.is_banned == False
                )
            )
        )
        return result.scalars().all()

    # async def get_all(self):
    #     """Получить всех незабаненных пользователей"""
    #     result = await self.db.execute(
    #         select(self.model).where(self.model.is_banned == False)
    #     )
    #     return result.scalars().all()
    #
    # async def get_all_including_banned(self):
    #     """Получить всех пользователей, включая забаненных"""
    #     result = await self.db.execute(select(self.model))
    #     return result.scalars().all()

    # async def deactivate_user(self, user_id):
    #     """Деактивировать пользователя"""
    #     user = await self.get(user_id)
    #     if user:
    #         user.is_active = 0
    #         self.db.add(user)
    #         await self.db.commit()
    #         return user
    #     return None
    #
    # async def activate_user(self, user_id):
    #     """Активировать пользователя"""
    #     user = await self.get(user_id)
    #     if user:
    #         user.is_active = 1
    #         self.db.add(user)
    #         await self.db.commit()
    #         return user
    #     return None

    # async def set_ban_status(self, user_id: UUID, is_banned: bool) -> Optional[User]:
    #     """Установить статус бана пользователя
    #
    #     Args:
    #         user_id: UUID пользователя
    #         is_banned: True - забанить, False - разбанить
    #
    #     Returns:
    #         User: Обновленный объект пользователя или None если пользователь не найден
    #     """
    #     user = await self.get(user_id, include_banned=True)
    #     if user:
    #         user.is_banned = is_banned
    #         self.db.add(user)
    #         await self.db.commit()
    #         await self.db.refresh(user)
    #         return user
    #     return None

    async def get(self, id, include_banned=False):
        """Получить пользователя по ID с возможностью включать забаненных"""
        if include_banned:
            result = await self.db.execute(
                select(self.model).where(self.model.id == id)
            )
        else:
            result = await self.db.execute(
                select(self.model).where(
                    and_(
                        self.model.id == id,
                        self.model.is_banned == False
                    )
                )
            )
        return result.scalar_one_or_none()

    async def change_role(self, user_id, new_role):
        """Изменить роль пользователя"""
        user = await self.get(user_id, include_banned=True)
        if user:
            if user.is_banned == False:
                return user
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
            user_type=role,
            is_banned=False
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def update_with_banned_user_info(self, user_id, **kwargs):
        """Обновить информацию о пользователе"""
        user = await self.get(user_id, include_banned=True)
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
