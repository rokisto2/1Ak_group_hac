from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    POSTGRES_CONTAINER: str
    POSTGRES_PORT: int
    POSTGRES_USER: str
    POSTGRES_USER_PASSWORD: str
    POSTGRES_DB: str
    MINIO_VERSION: str
    MINIO_MC_VERSION: str
    MINIO_CONTAINER: str
    MINIO_ROOT_USER: str
    MINIO_ROOT_PASSWORD: str
    MINIO_API_PORT: int
    MINIO_WEB_CONSOLE_PORT: int
    MINIO_BUCKET: str
    COMPOSE_PROJECT_NAME: str
    REDIS_VERSION: str
    REDIS_CONTAINER: str
    REDIS_PORT: int
    POSTGRES_VERSION:str
    POSTGRES_HOST:str
    MINIO_HOST:str
    TEMP_FILES_DIR:str

    @property
    def MINIO_ENDPOINT_URL(self):
        return f"http://{self.MINIO_HOST}:{self.MINIO_API_PORT}"
    @property
    def DATABASE_URL_asyncpg(self):
        print(f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_USER_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}")
        # DSN
        # postgresql+psycopg://postgres:postgres@localhost:5432/sa
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_USER_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    @property
    def DATABASE_URL_psycopg(self):
        print(f"postgresql+psycopg://{self.POSTGRES_USER}:{self.POSTGRES_USER_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}")
        # DSN
        # postgresql+psycopg://postgres:postgres@localhost:5432/sa
        return f"postgresql+psycopg://{self.POSTGRES_USER}:{self.POSTGRES_USER_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"


    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()