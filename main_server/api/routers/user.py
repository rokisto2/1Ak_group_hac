from fastapi import APIRouter, Depends, Query

from main_server.core.dependencies import get_user_repository
from main_server.core.dictionir.ROLE import UserRoles
from main_server.db.repositories import UserRepository
from main_server.api.schemas.user import UserPaginationResponse
from main_server.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/", response_model=UserPaginationResponse)
async def get_users_by_role(
        page: int = Query(default=1, ge=1, description="Номер страницы"),
        per_page: int = Query(default=10, le=100, description="Количество на странице"),
        user_repository: UserRepository = Depends(get_user_repository),
):
    """
    Получить пользователей по роли с пагинацией

    - **role**: фильтр по роли (по умолчанию 'user')
    - **page**: номер страницы (начинается с 1)
    - **per_page**: количество записей на странице (макс. 100)
    """
    user_service = UserService(user_repository)
    return await user_service.get_users_by_role_with_pagination(
        role=UserRoles.USER,
        page=page,
        per_page=per_page
    )