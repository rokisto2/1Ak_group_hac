import pytest
from unittest.mock import MagicMock, AsyncMock
from main_server.services.user_service import UserService
from main_server.db.repositories import UserRepository
from main_server.core import UserRoles
import uuid

@pytest.fixture
def mock_user_repository():
    return MagicMock(spec=UserRepository)

@pytest.fixture
def user_service(mock_user_repository):
    return UserService(user_repository=mock_user_repository)

def test_user_service_init(user_service, mock_user_repository):
    assert user_service.user_repository == mock_user_repository

@pytest.mark.asyncio
async def test_get_users_by_roles_with_pagination_defaults(user_service, mock_user_repository):
    mock_user_repository.get_users_by_roles = AsyncMock(return_value=["user1", "user2"])
    mock_user_repository.get_count_by_roles = AsyncMock(return_value=2)

    result = await user_service.get_users_by_roles_with_pagination()

    mock_user_repository.get_users_by_roles.assert_called_once_with(
        roles=[UserRoles.USER], offset=0, limit=10, is_banned=False
    )
    mock_user_repository.get_count_by_roles.assert_called_once_with(
        [UserRoles.USER], is_banned=False
    )
    assert result["users"] == ["user1", "user2"]
    assert result["pagination"]["total"] == 2
    assert result["pagination"]["page"] == 1
    assert result["pagination"]["per_page"] == 10
    assert result["pagination"]["total_pages"] == 1
    assert result["pagination"]["has_next"] is False
    assert result["pagination"]["has_prev"] is False

@pytest.mark.asyncio
async def test_get_users_by_roles_with_pagination_custom_params(user_service, mock_user_repository):
    mock_user_repository.get_users_by_roles = AsyncMock(return_value=["user3"])
    mock_user_repository.get_count_by_roles = AsyncMock(return_value=15)

    result = await user_service.get_users_by_roles_with_pagination(
        roles=[UserRoles.MANAGER], page=2, per_page=5, is_banned=True
    )

    mock_user_repository.get_users_by_roles.assert_called_once_with(
        roles=[UserRoles.MANAGER], offset=5, limit=5, is_banned=True
    )
    mock_user_repository.get_count_by_roles.assert_called_once_with(
        [UserRoles.MANAGER], is_banned=True
    )
    assert result["users"] == ["user3"]
    assert result["pagination"]["total"] == 15
    assert result["pagination"]["page"] == 2
    assert result["pagination"]["per_page"] == 5
    assert result["pagination"]["total_pages"] == 3
    assert result["pagination"]["has_next"] is True
    assert result["pagination"]["has_prev"] is True

@pytest.mark.asyncio
async def test_set_status_ban(user_service, mock_user_repository):
    mock_user_repository.update_with_banned_user_info = AsyncMock(return_value=True)
    user_id = uuid.uuid4()

    result = await user_service.set_status_ban(user_id, True)

    assert result is True
    mock_user_repository.update_with_banned_user_info.assert_called_once_with(
        user_id, is_banned=True
    )

@pytest.mark.asyncio
async def test_update_user_role(user_service, mock_user_repository):
    mock_user_repository.change_role = AsyncMock(return_value=True)
    user_id = uuid.uuid4()

    result = await user_service.update_user_role(user_id, UserRoles.MANAGER)

    assert result is True
    mock_user_repository.change_role.assert_called_once_with(
        user_id, UserRoles.MANAGER
    )
