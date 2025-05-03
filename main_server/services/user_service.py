from typing import Dict

from main_server.core import UserRoles
from main_server.db.repositories import UserRepository


class UserService:
    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository

    async def get_users_by_role_with_pagination(
            self,
            role: str = UserRoles.USER,
            page: int = 1,
            per_page: int = 10
    ) -> Dict:
        """
        Получить пользователей по роли с пагинацией

        :param role: Роль пользователя
        :param page: Номер страницы
        :param per_page: Количество записей на странице
        :return: Словарь с пользователями и метаданными пагинации
        """
        if page < 1:
            page = 1
        offset = (page - 1) * per_page

        users = await self.user_repository.get_user_by_roly(
            role=role,
            offset=offset,
            limit=per_page
        )

        total_count = await self.user_repository.get_count_by_role(role)
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
