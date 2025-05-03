# tg_bot/config.py
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Загружаем переменные из .env файла
load_dotenv()


class BotSettings(BaseSettings):
    BOT_TOKEN: str
    API_URL: str

    class Config:
        env_file = ".env-telegram"
        env_file_encoding = "utf-8"


bot_settings = BotSettings()