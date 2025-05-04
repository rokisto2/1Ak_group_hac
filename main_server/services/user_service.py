import uuid
from typing import Dict

from main_server.core import UserRoles
from main_server.db.repositories import UserRepository


class UserService:
    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository

    async def get_users_by_roles_with_pagination(
            self,
            roles: list[str] = [UserRoles.USER],
            page: int = 1,
            per_page: int = 10,
            is_banned: bool = False
    ) -> Dict:
        """
        Получить пользователей по списку ролей с пагинацией и сортировкой по ФИО

        :param is_banned:
        :param roles: Список ролей пользователей
        :param page: Номер страницы
        :param per_page: Количество записей на странице
        :return: Словарь с пользователями и метаданными пагинации
        """
        if page < 1:
            page = 1
        offset = (page - 1) * per_page

        users = await self.user_repository.get_users_by_roles(
            roles=roles,
            offset=offset,
            limit=per_page,
            is_banned=is_banned
        )

        total_count = await self.user_repository.get_count_by_roles(roles, is_banned=is_banned)
        total_pages = (total_count + per_page - 1) // per_page

        return {
            "users": users,
            "pagination": {
                "total": total_count,
                "page": page,
                "per_page": per_page,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1
            }
        }

    async def set_status_ban(self, user_id: uuid.UUID, is_banned: bool):
        """
        Установить статус бана для пользователя
        :param user_id: ID пользователя
        :param is_banned: True, если пользователь забанен, иначе False
        :return: True, если статус успешно изменен, иначе False
        """
        return await self.user_repository.update_with_banned_user_info(user_id,is_banned = is_banned)

    async def update_user_role(self, user_id, role):
        """
        Изменить роль пользователя
        :param user_id:
        :param role:
        :return: True, если роль успешно изменена, иначе False
        """
        return await self.user_repository.change_role(user_id, role)