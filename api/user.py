import uuid

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, List

from core.dependencies import get_db_session, get_user_repository
from core.dictionir.ROLE import UserRoles
from db.repositories import UserRepository
from services.user_service import UserService

router = APIRouter(prefix="/users", tags=["users"])


class UserOut(BaseModel):
    id: uuid.UUID  # Используем UUID тип напрямую
    full_name: str
    email: str
    user_type: str

    class Config:
        from_attributes = True


class PaginationOut(BaseModel):
    total: int
    page: int
    per_page: int
    total_pages: int
    has_next: bool
    has_prev: bool

class UserPaginationResponse(BaseModel):
    users: List[UserOut]
    pagination: PaginationOut


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