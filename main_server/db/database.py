from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from main_server.db.config import settings

async_engine = create_async_engine(
    url=settings.DATABASE_URL_asyncpg,
    echo=True,
)

async_session_factory = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession
)
