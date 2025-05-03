from fastapi import APIRouter, Depends, Query, HTTPException, status, Path
from uuid import UUID
from pydantic import BaseModel
from typing import List

from main_server.core.dependencies import get_user_repository, get_manager_user
from main_server.core.dictionir.ROLE import UserRoles
from main_server.db.repositories import UserRepository
from main_server.api.schemas.user import UserPaginationResponse
from main_server.services.user_service import UserService
from main_server.api.schemas.user import UserRoleUpdate
router = APIRouter(prefix="/users", tags=["users"])

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


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
        user_id: UUID = Path(..., description="ID пользователя для удаления"),
        user_repository: UserRepository = Depends(get_user_repository),
        _: dict = Depends(get_manager_user)  # Проверка, что пользователь - менеджер
):
    """
    Удаление пользователя (доступно только для менеджеров)

    - **user_id**: ID пользователя для удаления
    """
    user_service = UserService(user_repository)
    success = await user_service.delete_user(user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Пользователь с ID {user_id} не найден"
        )




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
    return {"id": user.id, "email": user.email, "role": user.user_type}