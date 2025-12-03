import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from main_server.db.repositories.user_repository import UserRepository
from main_server.db.models.user import User
from main_server.core.dictionir.ROLE import UserRoles


@pytest.fixture
def user_repository(db_session: AsyncSession) -> UserRepository:
    """Fixture that provides UserRepository instance"""
    return UserRepository(db_session)


@pytest.fixture
async def create_test_user(user_repository: UserRepository, db_session: AsyncSession) -> User:
    """Creates a test user for repository tests"""
    user = await user_repository.create_user(
        full_name="Test User",
        email="test@example.com",
        password_hash="some_hash",
        role=UserRoles.USER
    )
    await db_session.refresh(user)
    yield user


@pytest.mark.asyncio
async def test_create_user(user_repository: UserRepository, db_session: AsyncSession):
    """Test creating a new user"""
    full_name = "John Doe"
    email = "john.doe@example.com"
    password_hash = "hashed_password"
    
    user = await user_repository.create_user(
        full_name=full_name,
        email=email,
        password_hash=password_hash
    )
    await db_session.refresh(user)

    assert user is not None
    assert user.full_name == full_name
    assert user.email == email
    assert user.user_type == UserRoles.USER
    assert user.is_banned is False


@pytest.mark.asyncio
async def test_get_by_email(user_repository: UserRepository, create_test_user: User):
    """Test finding user by email"""
    found_user = await user_repository.get_by_email("test@example.com")
    assert found_user is not None
    assert found_user.id == create_test_user.id
    assert found_user.email == create_test_user.email


@pytest.mark.asyncio
async def test_get_by_telegram_id(user_repository: UserRepository, db_session: AsyncSession):
    """Test finding user by Telegram chat ID"""
    chat_id = "12345"
    user = await user_repository.create_user(
        full_name="Telegram User",
        email="telegram@example.com",
        password_hash="hash",
        chat_id=chat_id
    )
    await db_session.refresh(user)

    found_user = await user_repository.get_by_telegram_id(chat_id)
    assert found_user is not None
    assert found_user.chat_id == chat_id


@pytest.mark.asyncio
async def test_get_users_by_ids(user_repository: UserRepository, create_test_user: User):
    """Test fetching multiple users by their IDs"""
    users = await user_repository.get_users_by_ids([create_test_user.id])
    assert len(users) == 1
    assert users[0].id == create_test_user.id


@pytest.mark.asyncio
async def test_get_users_by_roles(user_repository: UserRepository, create_test_user: User):
    """Test fetching users filtered by role"""
    users = await user_repository.get_users_by_roles([UserRoles.USER])
    user_ids = [u.id for u in users]
    assert create_test_user.id in user_ids


@pytest.mark.asyncio
async def test_get_count_by_roles(user_repository: UserRepository, db_session: AsyncSession):
    """Test counting users by role"""
    initial_count = await user_repository.get_count_by_roles([UserRoles.USER])
    
    user = await user_repository.create_user(
        full_name="Count Test User",
        email="count@example.com",
        password_hash="some_hash",
        role=UserRoles.USER
    )

    new_count = await user_repository.get_count_by_roles([UserRoles.USER])
    
    assert new_count == initial_count + 1


@pytest.mark.asyncio
async def test_get_superusers(user_repository: UserRepository, db_session: AsyncSession):
    """Test fetching all superusers"""
    superuser = await user_repository.create_user(
        full_name="Super User",
        email="super@example.com",
        password_hash="hash",
        role=UserRoles.SUPERUSER
    )
    await db_session.refresh(superuser)

    superusers = await user_repository.get_superusers()
    superuser_ids = [u.id for u in superusers]
    assert superuser.id in superuser_ids


@pytest.mark.asyncio
async def test_ban_user(user_repository: UserRepository, create_test_user: User, db_session: AsyncSession):
    """Test banning a user using update_with_banned_user_info"""
    assert create_test_user.is_banned is False

    # Use update_with_banned_user_info to set is_banned to True
    updated_user = await user_repository.update_with_banned_user_info(
        create_test_user.id,
        is_banned=True
    )

    assert updated_user is not None
    assert updated_user.is_banned is True


@pytest.mark.asyncio
async def test_unban_user(user_repository: UserRepository, db_session: AsyncSession):
    """Test unbanning a user using update_with_banned_user_info"""
    user = await user_repository.create_user(
        full_name="Banned User",
        email="banned@example.com",
        password_hash="hash"
    )

    # Ban the user first
    await user_repository.update_with_banned_user_info(user.id, is_banned=True)

    banned_user = await user_repository.get(user.id, include_banned=True)
    assert banned_user.is_banned is True

    # Unban the user
    unbanned_user = await user_repository.update_with_banned_user_info(user.id, is_banned=False)

    assert unbanned_user.is_banned is False


@pytest.mark.asyncio
async def test_update_chat_id(user_repository: UserRepository, create_test_user: User, db_session: AsyncSession):
    """Test updating user's Telegram chat ID using update_user_info"""
    new_chat_id = "999888777"

    # Use update_user_info to set chat_id
    updated_user = await user_repository.update_user_info(
        create_test_user.id,
        chat_id=new_chat_id
    )

    assert updated_user is not None
    assert updated_user.chat_id == new_chat_id


@pytest.mark.asyncio
async def test_change_role(user_repository: UserRepository, create_test_user: User, db_session: AsyncSession):
    """Test changing user's role"""
    new_role = UserRoles.MANAGER

    updated_user = await user_repository.change_role(create_test_user.id, new_role)

    assert updated_user is not None
    assert updated_user.user_type == new_role

