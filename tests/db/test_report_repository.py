import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from main_server.db.repositories.report_repository import ReportRepository
from main_server.db.repositories.user_repository import UserRepository
from main_server.db.models import User, GeneratedReport
from main_server.core.dictionir.ROLE import UserRoles
from datetime import datetime, timedelta
import uuid


@pytest.fixture
def user_repository(db_session: AsyncSession) -> UserRepository:
    """Fixture that provides UserRepository instance"""
    return UserRepository(db_session)


@pytest.fixture
def report_repository(db_session: AsyncSession) -> ReportRepository:
    """Fixture that provides ReportRepository instance"""
    return ReportRepository(db_session)


@pytest.fixture
async def create_test_user(user_repository: UserRepository, db_session: AsyncSession) -> User:
    """Creates a test user for report tests"""
    user = await user_repository.create_user(
        full_name="Test Report User",
        email="test_report@example.com",
        password_hash="some_hash",
        role=UserRoles.USER
    )
    await db_session.refresh(user)
    yield user


@pytest.mark.asyncio
async def test_create_report(report_repository: ReportRepository, create_test_user: User, db_session: AsyncSession):
    """Test creating a new report"""
    report_name = "Test Report"
    report_url = "https://example.com/reports/test.pdf"
    user_id = create_test_user.id

    report = await report_repository.create_report(
        report_name=report_name,
        report_url=report_url,
        user_id=user_id
    )

    assert report is not None
    assert report.report_name == report_name
    assert report.report_url == report_url
    assert report.user_id == user_id
    assert report.id is not None
    assert report.generated_at is not None


@pytest.mark.asyncio
async def test_get_report_by_id(report_repository: ReportRepository, create_test_user: User, db_session: AsyncSession):
    """Test retrieving a report by its ID"""
    # Create a report first
    report = await report_repository.create_report(
        report_name="Report to Find",
        report_url="https://example.com/reports/find.pdf",
        user_id=create_test_user.id
    )

    # Retrieve the report by ID
    found_report = await report_repository.get_report_by_id(report.id)

    assert found_report is not None
    assert found_report.id == report.id
    assert found_report.report_name == "Report to Find"
    assert found_report.user_id == create_test_user.id


@pytest.mark.asyncio
async def test_get_report_by_id_not_found(report_repository: ReportRepository, db_session: AsyncSession):
    """Test retrieving a non-existent report returns None"""
    non_existent_id = uuid.uuid4()

    report = await report_repository.get_report_by_id(non_existent_id)

    assert report is None


@pytest.mark.asyncio
async def test_get_reports_by_user_id(report_repository: ReportRepository, create_test_user: User, db_session: AsyncSession):
    """Test retrieving all reports for a specific user"""
    user_id = create_test_user.id

    # Create multiple reports for the user
    report1 = await report_repository.create_report(
        report_name="Report 1",
        report_url="https://example.com/reports/1.pdf",
        user_id=user_id
    )

    report2 = await report_repository.create_report(
        report_name="Report 2",
        report_url="https://example.com/reports/2.pdf",
        user_id=user_id
    )

    report3 = await report_repository.create_report(
        report_name="Report 3",
        report_url="https://example.com/reports/3.pdf",
        user_id=user_id
    )

    # Retrieve all reports for the user
    reports = await report_repository.get_reports_by_user_id(user_id)

    assert len(reports) == 3
    report_ids = [r.id for r in reports]
    assert report1.id in report_ids
    assert report2.id in report_ids
    assert report3.id in report_ids


@pytest.mark.asyncio
async def test_get_reports_by_user_id_empty(report_repository: ReportRepository, create_test_user: User, db_session: AsyncSession):
    """Test retrieving reports for a user with no reports returns empty list"""
    user_id = create_test_user.id

    reports = await report_repository.get_reports_by_user_id(user_id)

    assert reports == []


@pytest.mark.asyncio
async def test_get_reports_by_user_id_with_date_filter(
    report_repository: ReportRepository,
    create_test_user: User,
    db_session: AsyncSession
):
    """Test retrieving reports with date range filtering"""
    user_id = create_test_user.id

    # Create reports (they will have generated_at set to current time)
    report1 = await report_repository.create_report(
        report_name="Old Report",
        report_url="https://example.com/reports/old.pdf",
        user_id=user_id
    )

    report2 = await report_repository.create_report(
        report_name="New Report",
        report_url="https://example.com/reports/new.pdf",
        user_id=user_id
    )

    # Filter from recent time (should get both reports as they're just created)
    date_from = datetime.utcnow() - timedelta(hours=1)
    reports = await report_repository.get_reports_by_user_id(user_id, date_from=date_from)

    assert len(reports) >= 2

    # Filter from future time (should get no reports)
    date_from_future = datetime.utcnow() + timedelta(hours=1)
    reports_future = await report_repository.get_reports_by_user_id(user_id, date_from=date_from_future)

    assert len(reports_future) == 0


@pytest.mark.asyncio
async def test_get_reports_by_user_id_ordered_by_date(
    report_repository: ReportRepository,
    create_test_user: User,
    db_session: AsyncSession
):
    """Test that reports are returned ordered by generated_at in descending order"""
    user_id = create_test_user.id

    # Create multiple reports
    report1 = await report_repository.create_report(
        report_name="First Report",
        report_url="https://example.com/reports/first.pdf",
        user_id=user_id
    )

    report2 = await report_repository.create_report(
        report_name="Second Report",
        report_url="https://example.com/reports/second.pdf",
        user_id=user_id
    )

    report3 = await report_repository.create_report(
        report_name="Third Report",
        report_url="https://example.com/reports/third.pdf",
        user_id=user_id
    )

    # Retrieve reports
    reports = await report_repository.get_reports_by_user_id(user_id)

    # Check that they are ordered by generated_at descending (newest first)
    assert len(reports) == 3
    assert reports[0].id == report3.id  # Most recent
    assert reports[1].id == report2.id
    assert reports[2].id == report1.id  # Oldest


@pytest.mark.asyncio
async def test_get_reports_by_user_id_with_date_to_filter(
    report_repository: ReportRepository,
    create_test_user: User,
    db_session: AsyncSession
):
    """Test retrieving reports with date_to filtering"""
    user_id = create_test_user.id

    # Create a report
    report = await report_repository.create_report(
        report_name="Report with date_to",
        report_url="https://example.com/reports/date_to.pdf",
        user_id=user_id
    )

    # Filter up to future time (should include the report)
    date_to = datetime.utcnow() + timedelta(hours=1)
    reports = await report_repository.get_reports_by_user_id(user_id, date_to=date_to)

    assert len(reports) == 1
    assert reports[0].id == report.id

    # Filter up to past time (should not include the report)
    date_to_past = datetime.utcnow() - timedelta(hours=1)
    reports_past = await report_repository.get_reports_by_user_id(user_id, date_to=date_to_past)

    assert len(reports_past) == 0


@pytest.mark.asyncio
async def test_get_reports_by_user_id_with_both_date_filters(
    report_repository: ReportRepository,
    create_test_user: User,
    db_session: AsyncSession
):
    """Test retrieving reports with both date_from and date_to filtering"""
    user_id = create_test_user.id

    # Create a report
    report = await report_repository.create_report(
        report_name="Report in range",
        report_url="https://example.com/reports/range.pdf",
        user_id=user_id
    )

    # Filter with range that includes the report
    date_from = datetime.utcnow() - timedelta(hours=1)
    date_to = datetime.utcnow() + timedelta(hours=1)
    reports = await report_repository.get_reports_by_user_id(
        user_id,
        date_from=date_from,
        date_to=date_to
    )

    assert len(reports) == 1
    assert reports[0].id == report.id

    # Filter with range that excludes the report (in the past)
    date_from_past = datetime.utcnow() - timedelta(hours=5)
    date_to_past = datetime.utcnow() - timedelta(hours=2)
    reports_past = await report_repository.get_reports_by_user_id(
        user_id,
        date_from=date_from_past,
        date_to=date_to_past
    )

    assert len(reports_past) == 0


@pytest.mark.asyncio
async def test_multiple_users_reports_isolation(
    report_repository: ReportRepository,
    user_repository: UserRepository,
    create_test_user: User,
    db_session: AsyncSession
):
    """Test that reports are properly isolated between different users"""
    user1_id = create_test_user.id

    # Create second user
    user2 = await user_repository.create_user(
        full_name="Second User",
        email="user2_report@example.com",
        password_hash="some_hash",
        role=UserRoles.USER
    )
    user2_id = user2.id

    # Create reports for user1
    await report_repository.create_report(
        report_name="User1 Report 1",
        report_url="https://example.com/reports/u1_r1.pdf",
        user_id=user1_id
    )

    await report_repository.create_report(
        report_name="User1 Report 2",
        report_url="https://example.com/reports/u1_r2.pdf",
        user_id=user1_id
    )

    # Create reports for user2
    await report_repository.create_report(
        report_name="User2 Report 1",
        report_url="https://example.com/reports/u2_r1.pdf",
        user_id=user2_id
    )

    # Verify user1 has 2 reports
    user1_reports = await report_repository.get_reports_by_user_id(user1_id)
    assert len(user1_reports) == 2
    assert all(r.user_id == user1_id for r in user1_reports)

    # Verify user2 has 1 report
    user2_reports = await report_repository.get_reports_by_user_id(user2_id)
    assert len(user2_reports) == 1
    assert all(r.user_id == user2_id for r in user2_reports)


@pytest.mark.asyncio
async def test_create_report_with_special_characters(
    report_repository: ReportRepository,
    create_test_user: User,
    db_session: AsyncSession
):
    """Test creating a report with special characters in name and URL"""
    user_id = create_test_user.id
    report_name = "Test Report: Данные & Символы <2024>"
    report_url = "https://example.com/reports/файл-отчёт.pdf?param=value&other=123"

    report = await report_repository.create_report(
        report_name=report_name,
        report_url=report_url,
        user_id=user_id
    )

    assert report is not None
    assert report.report_name == report_name
    assert report.report_url == report_url

    # Verify it can be retrieved
    found_report = await report_repository.get_report_by_id(report.id)
    assert found_report.report_name == report_name
    assert found_report.report_url == report_url

