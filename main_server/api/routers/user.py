from fastapi import APIRouter, Depends, Query, HTTPException, status, Path
from uuid import UUID
from pydantic import BaseModel
from typing import List

from main_server.core.dependencies import get_user_repository, get_manager_user
from main_server.core.dictionir.ROLE import UserRoles
from main_server.db.repositories import UserRepository
from main_server.api.schemas.user import UserPaginationResponse, UserBanUpdate, AllUserPaginationResponse
from main_server.services.user_service import UserService
from main_server.api.schemas.user import UserRoleUpdate
router = APIRouter(prefix="/users", tags=["users"])


@router.get("/all", response_model=AllUserPaginationResponse)
async def get_all_users_including_banned(
        page: int = Query(default=1, ge=1, description="Номер страницы"),
        per_page: int = Query(default=10, le=100, description="Количество на странице"),
        user_repository: UserRepository = Depends(get_user_repository),
        _: dict = Depends(get_manager_user),  # Проверка, что пользователь - менеджер
):
    """
    Получить всех пользователей (USER, SUPERUSER), включая забаненных, с пагинацией
    (доступно только для менеджеров)

    - **page**: номер страницы (начинается с 1)
    - **per_page**: количество записей на странице (макс. 100)
    """
    user_service = UserService(user_repository)

    return await user_service.get_users_by_roles_with_pagination(
        roles=[UserRoles.USER, UserRoles.SUPERUSER],
        page=page,
        per_page=per_page,
        is_banned=True  # Получение забаненных пользователей
    )

@router.get("/", response_model=UserPaginationResponse)
async def get_users_by_roles(
        roles: List[str] = Query(default=[UserRoles.USER], description="Список ролей пользователей"),
        page: int = Query(default=1, ge=1, description="Номер страницы"),
        per_page: int = Query(default=10, le=100, description="Количество на странице"),
        user_repository: UserRepository = Depends(get_user_repository),
):
    """
    Получить пользователей по списку ролей с пагинацией и сортировкой по ФИО

    - **roles**: фильтр по списку ролей (по умолчанию ['user'])
    - **page**: номер страницы (начинается с 1)
    - **per_page**: количество записей на странице (макс. 100)
    """
    user_service = UserService(user_repository)
    return await user_service.get_users_by_roles_with_pagination(
        roles=roles,
        page=page,
        per_page=per_page
    )


@router.put("/{user_id}/ban-status", status_code=status.HTTP_200_OK)
async def update_user_ban_status(
        user_id: UUID = Path(..., description="ID пользователя"),
        ban_data: UserBanUpdate = None,
        user_repository: UserRepository = Depends(get_user_repository),
        _: dict = Depends(get_manager_user)  # Проверка, что пользователь - менеджер
):
    """
    Установка статуса бана для пользователя (доступно только для менеджеров)

    - **user_id**: ID пользователя
    - **is_banned**: True для блокировки, False для разблокировки пользователя
    """
    if ban_data is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Требуется параметр is_banned"
        )

    user_service = UserService(user_repository)
    user = await user_service.set_status_ban(user_id, ban_data.is_banned)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Пользователь с ID {user_id} не найден"
        )

    return {
        "id": user.id,
        "email": user.email,
        "role": user.user_type,
        "is_banned": user.is_banned
    }




@router.put("/{user_id}/role", status_code=status.HTTP_200_OK)
async def update_user_role(
        user_id: UUID = Path(..., description="ID пользователя"),
        role_data: UserRoleUpdate = None,
        user_repository: UserRepository = Depends(get_user_repository),
        _: dict = Depends(get_manager_user)  # Проверка, что пользователь - менеджер
):
    """
    Изменение роли пользователя (доступно только для менеджеров)

    - **user_id**: ID пользователя
    - **role**: Новая роль пользователя
    """
    user_service = UserService(user_repository)
    user = await user_service.update_user_role(user_id, role_data.role)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Пользователь с ID {user_id} не найден"
        )

    if user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Пользователь с ID {user_id} забанен и не может быть изменен"
        )

    return {"id": user.id, "email": user.email, "role": user.user_type}