from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator
import aioboto3
from botocore.client import BaseClient

from fastapi import Depends
from db.config import settings
from db.database import async_session_factory
from sqlalchemy.ext.asyncio import AsyncSession
from db.repositories import ReportRepository, S3StorageRepository


async def get_db_session() -> AsyncGenerator[Any, Any]:
    async with async_session_factory() as session:
        yield session


async def get_s3_client() -> BaseClient:
    session = aioboto3.Session()

    async with session.client(
            's3',
            endpoint_url=settings.MINIO_ENDPOINT_URL,
            aws_access_key_id=settings.MINIO_ROOT_USER,
            aws_secret_access_key=settings.MINIO_ROOT_PASSWORD,
            region_name="us-east-1"
    ) as client:
        return client


async def get_s3_storage_repository(
        s3_client=Depends(get_s3_client)
) -> S3StorageRepository:
    repo = S3StorageRepository(s3_client, settings.MINIO_BUCKET)
    await repo.initialize()
    return repo


async def get_report_repository(
        session: AsyncSession = Depends(get_db_session)
) -> ReportRepository:
    return ReportRepository(session)
