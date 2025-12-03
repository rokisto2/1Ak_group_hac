import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from main_server.db.repositories.base_repository import BaseRepository
from main_server.db.models import User
import uuid


@pytest.fixture
def base_repository(db_session: AsyncSession) -> BaseRepository:
    """Fixture that provides BaseRepository instance configured for User model"""
    repo = BaseRepository(db_session)
    repo.model = User
    return repo


@pytest.fixture
async def create_test_user_for_base_repo(base_repository: BaseRepository, db_session: AsyncSession) -> User:
    """Creates a test user for base repository tests"""
    user = User(
        id=uuid.uuid4(),
        full_name="Base Repo User",
        email="baserepo@example.com",
        password_hash="some_hash"
    )
    created_user = await base_repository.create(user)
    await db_session.commit()
    await db_session.refresh(created_user)
    yield created_user


@pytest.mark.asyncio
async def test_create(base_repository: BaseRepository, db_session: AsyncSession):
    """Test creating an entity using base repository"""
    user = User(
        id=uuid.uuid4(),
        full_name="Create Test User",
        email="create@example.com",
        password_hash="some_hash"
    )
    created_user = await base_repository.create(user)
    await db_session.commit()
    await db_session.refresh(created_user)

    assert created_user is not None
    assert created_user.full_name == "Create Test User"


@pytest.mark.asyncio
async def test_get(base_repository: BaseRepository, create_test_user_for_base_repo: User):
    """Test retrieving an entity by ID using base repository"""
    user_id = create_test_user_for_base_repo.id
    user = await base_repository.get(user_id)
    assert user is not None
    assert user.id == user_id


@pytest.mark.asyncio
async def test_get_all(base_repository: BaseRepository, create_test_user_for_base_repo: User):
    """Test retrieving all entities using base repository"""
    user_id = create_test_user_for_base_repo.id
    users = await base_repository.get_all()
    assert isinstance(users, list)
    assert len(users) > 0
    assert user_id in [user.id for user in users]


@pytest.mark.asyncio
async def test_update(base_repository: BaseRepository, create_test_user_for_base_repo: User, db_session: AsyncSession):
    """Test updating an entity using base repository"""
    user = create_test_user_for_base_repo
    user.full_name = "Updated Base Repo User"
    updated_user = await base_repository.update(user)
    await db_session.commit()
    await db_session.refresh(updated_user)

    assert updated_user.full_name == "Updated Base Repo User"


@pytest.mark.asyncio
async def test_delete(base_repository: BaseRepository, db_session: AsyncSession):
    """Test deleting an entity using base repository"""
    user = User(
        id=uuid.uuid4(),
        full_name="Delete Test User",
        email="delete@example.com",
        password_hash="some_hash"
    )
    created_user = await base_repository.create(user)
    await db_session.commit()
    user_id = created_user.id
    
    await base_repository.delete(created_user)
    await db_session.commit()

    deleted_user = await base_repository.get(user_id)
    assert deleted_user is None
