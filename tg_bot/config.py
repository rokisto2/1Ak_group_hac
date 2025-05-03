# tg_bot/config.py
from pydantic_settings import BaseSettings

class BotSettings(BaseSettings):
    # Существующие настройки
    BOT_TOKEN: str
    API_URL: str

    # Добавляем настройки для Minio/S3
    S3_ENDPOINT_URL: str
    S3_ACCESS_KEY: str
    S3_SECRET_KEY: str
    S3_BUCKET: str

    class Config:
        env_file = ".env-telegram"
        env_file_encoding = "utf-8"


bot_settings = BotSettings()