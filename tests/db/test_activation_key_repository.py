import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from main_server.db.repositories.activation_key_repository import ActivationKeyRepository
from main_server.db.repositories.user_repository import UserRepository
from main_server.db.models import User, ActivationKey
from main_server.core.dictionir.ROLE import UserRoles
from datetime import datetime, timedelta, timezone
import asyncio


@pytest.fixture
def user_repository(db_session: AsyncSession) -> UserRepository:
    """Fixture that provides UserRepository instance"""
    return UserRepository(db_session)


@pytest.fixture
def activation_key_repository(db_session: AsyncSession) -> ActivationKeyRepository:
    """Fixture that provides ActivationKeyRepository instance"""
    return ActivationKeyRepository(db_session)


@pytest.fixture
async def create_test_user(user_repository: UserRepository, db_session: AsyncSession) -> User:
    """Creates a test user for activation key tests"""
    user = await user_repository.create_user(
        full_name="Test User",
        email="test_activation@example.com",
        password_hash="some_hash",
        role=UserRoles.USER
    )
    await db_session.refresh(user)
    yield user


@pytest.mark.asyncio
async def test_upsert_key(activation_key_repository: ActivationKeyRepository, create_test_user: User, db_session: AsyncSession):
    """Test creating and updating activation key for a user"""
    user_id = create_test_user.id

    # Create a key (autocommit=True by default)
    key = await activation_key_repository.upsert_key(user_id)

    assert key is not None
    assert key.user_id == user_id
    assert key.key is not None
    assert key.expires_at is not None

    first_key_value = key.key
    first_key_expires_at = key.expires_at

    # Update the key
    await asyncio.sleep(1)  # Ensure the new key is different
    new_key = await activation_key_repository.upsert_key(user_id)

    assert new_key is not None
    assert new_key.user_id == user_id
    assert first_key_value != new_key.key
    assert first_key_expires_at != new_key.expires_at


@pytest.mark.asyncio
async def test_key_exists(activation_key_repository: ActivationKeyRepository, create_test_user: User, db_session: AsyncSession):
    """Test checking if activation key exists"""
    key = await activation_key_repository.upsert_key(create_test_user.id)

    exists = await activation_key_repository.key_exists(key.key)
    assert exists is True

    non_existent_key = "non_existent_key_12345"
    exists = await activation_key_repository.key_exists(non_existent_key)
    assert exists is False


@pytest.mark.asyncio
async def test_upsert_key_replaces_old_key(activation_key_repository: ActivationKeyRepository, create_test_user: User, db_session: AsyncSession):
    """Test that upsert_key deletes old keys before creating new one"""
    user_id = create_test_user.id

    # Create first key
    first_key = await activation_key_repository.upsert_key(user_id)
    first_key_value = first_key.key

    # Create second key - should replace the first
    second_key = await activation_key_repository.upsert_key(user_id)

    # First key should no longer exist
    first_exists = await activation_key_repository.key_exists(first_key_value)
    assert first_exists is False

    # Second key should exist
    second_exists = await activation_key_repository.key_exists(second_key.key)
    assert second_exists is True


@pytest.mark.asyncio
async def test_upsert_key_custom_expiration(activation_key_repository: ActivationKeyRepository, create_test_user: User, db_session: AsyncSession):
    """Test creating activation key with custom expiration time"""
    user_id = create_test_user.id
    custom_hours = 48

    key = await activation_key_repository.upsert_key(user_id, expires_hours=custom_hours)

    assert key is not None
    assert key.expires_at is not None

    # Check that expiration is approximately correct (within 1 minute tolerance)
    # Use timezone-aware datetime for comparison
    expected_expiry = datetime.utcnow().replace(tzinfo=timezone.utc) + timedelta(hours=custom_hours)

    # Handle both timezone-aware and timezone-naive datetimes
    key_expires_at = key.expires_at
    if key_expires_at.tzinfo is None:
        key_expires_at = key_expires_at.replace(tzinfo=timezone.utc)

    time_diff = abs((key_expires_at - expected_expiry).total_seconds())
    assert time_diff < 60  # Less than 1 minute difference
