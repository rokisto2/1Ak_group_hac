import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from main_server.db.repositories.report_delivery_log_repository import ReportDeliveryLogRepository
from main_server.db.repositories.user_repository import UserRepository
from main_server.db.repositories.report_repository import ReportRepository
from main_server.db.models import User, GeneratedReport, ReportDeliveryLog
from main_server.core.dictionir import DeliveryMethodEnum, DeliveryStatusEnum


@pytest.fixture
def user_repository(db_session: AsyncSession) -> UserRepository:
    """Fixture that provides UserRepository instance"""
    return UserRepository(db_session)


@pytest.fixture
def report_repository(db_session: AsyncSession) -> ReportRepository:
    """Fixture that provides ReportRepository instance"""
    return ReportRepository(db_session)


@pytest.fixture
def report_delivery_log_repository(db_session: AsyncSession) -> ReportDeliveryLogRepository:
    """Fixture that provides ReportDeliveryLogRepository instance"""
    return ReportDeliveryLogRepository(db_session)


@pytest.fixture
async def create_test_user(user_repository: UserRepository, db_session: AsyncSession) -> User:
    """Creates a test user for repository tests"""
    user = await user_repository.create_user(
        full_name="Test User",
        email="test_report_user@example.com",
        password_hash="some_hash"
    )
    await db_session.commit()
    await db_session.refresh(user)
    yield user


@pytest.fixture
async def create_test_report(report_repository: ReportRepository, create_test_user: User, db_session: AsyncSession) -> GeneratedReport:
    """Creates a test report for repository tests"""
    report = await report_repository.create_report(
        user_id=create_test_user.id,
        report_name="Test Report",
        report_url="http://example.com/report.pdf"
    )
    await db_session.commit()
    await db_session.refresh(report)
    yield report


@pytest.mark.asyncio
async def test_create_log(report_delivery_log_repository: ReportDeliveryLogRepository, create_test_report: GeneratedReport, db_session: AsyncSession):
    """Test creating a single delivery log entry"""
    user_id = create_test_report.user_id
    report_id = create_test_report.id

    log = await report_delivery_log_repository.create_log(
        recipient_id=user_id,
        report_id=report_id,
        method=DeliveryMethodEnum.EMAIL,
        status=DeliveryStatusEnum.SENDING
    )
    await db_session.commit()

    assert log is not None
    assert log.user_id == user_id
    assert log.report_id == report_id
    assert log.status == DeliveryStatusEnum.SENDING
    assert log.delivery_method == DeliveryMethodEnum.EMAIL


@pytest.mark.asyncio
async def test_bulk_create_logs(
    report_delivery_log_repository: ReportDeliveryLogRepository,
    user_repository: UserRepository,
    create_test_report: GeneratedReport,
    db_session: AsyncSession
):
    """Test bulk creation of delivery logs for multiple recipients"""
    user1 = await user_repository.create_user(full_name="User 1", email="user1@example.com", password_hash="hash")
    user2 = await user_repository.create_user(full_name="User 2", email="user2@example.com", password_hash="hash")
    await db_session.commit()

    report_id = create_test_report.id
    
    logs = await report_delivery_log_repository.bulk_create_logs(
        recipient_ids=[user1.id, user2.id],
        report_id=report_id,
        method=DeliveryMethodEnum.EMAIL,
        status=DeliveryStatusEnum.SENDING
    )
    
    assert len(logs) == 2
    assert all(log.report_id == report_id for log in logs)
    assert all(log.status == DeliveryStatusEnum.SENDING for log in logs)


@pytest.mark.asyncio
async def test_update_status(report_delivery_log_repository: ReportDeliveryLogRepository, create_test_report: GeneratedReport, db_session: AsyncSession):
    """Test updating delivery log status"""
    user_id = create_test_report.user_id
    report_id = create_test_report.id

    log = await report_delivery_log_repository.create_log(
        recipient_id=user_id,
        report_id=report_id,
        method=DeliveryMethodEnum.EMAIL,
        status=DeliveryStatusEnum.SENDING
    )
    await db_session.commit()

    updated_log = await report_delivery_log_repository.update_status(log.id, DeliveryStatusEnum.SENT)
    await db_session.commit()

    assert updated_log.status == DeliveryStatusEnum.SENT


@pytest.mark.asyncio
async def test_get_user_logs_count(report_delivery_log_repository: ReportDeliveryLogRepository, create_test_report: GeneratedReport, db_session: AsyncSession):
    """Test counting user's delivery logs"""
    user_id = create_test_report.user_id
    report_id = create_test_report.id

    await report_delivery_log_repository.create_log(
        recipient_id=user_id,
        report_id=report_id,
        method=DeliveryMethodEnum.EMAIL,
        status=DeliveryStatusEnum.SENDING
    )
    await db_session.commit()

    count = await report_delivery_log_repository.get_user_logs_count(user_id)
    
    assert count >= 1


@pytest.mark.asyncio
async def test_get_user_logs_paginated(report_delivery_log_repository: ReportDeliveryLogRepository, create_test_report: GeneratedReport, db_session: AsyncSession):
    """Test fetching user's delivery logs with pagination"""
    user_id = create_test_report.user_id
    report_id = create_test_report.id

    await report_delivery_log_repository.create_log(
        recipient_id=user_id,
        report_id=report_id,
        method=DeliveryMethodEnum.EMAIL,
        status=DeliveryStatusEnum.SENDING
    )
    await db_session.commit()

    logs = await report_delivery_log_repository.get_user_logs_paginated(user_id, 0, 10)
    
    assert len(logs) >= 1
    assert logs[0].user_id == user_id


@pytest.mark.asyncio
async def test_get_user_received_reports_paginated(
    report_delivery_log_repository: ReportDeliveryLogRepository,
    create_test_report: GeneratedReport,
    db_session: AsyncSession
):
    """Test fetching user's received reports with details"""
    user_id = create_test_report.user_id
    report_id = create_test_report.id

    await report_delivery_log_repository.create_log(
        recipient_id=user_id,
        report_id=report_id,
        method=DeliveryMethodEnum.EMAIL,
        status=DeliveryStatusEnum.SENT
    )
    await db_session.commit()

    reports, count = await report_delivery_log_repository.get_user_received_reports_paginated(user_id)
    
    assert count >= 1
    assert len(reports) >= 1
    assert reports[0]["report_name"] == "Test Report"
    assert reports[0]["report_url"] == "http://example.com/report.pdf"
    assert reports[0]["delivery_method"] == DeliveryMethodEnum.EMAIL
