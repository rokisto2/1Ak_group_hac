# tg_bot/config.py
from pydantic_settings import BaseSettings

class BotSettings(BaseSettings):
    #TODO: Перенести в env файл
    BOT_TOKEN: str = "7373779477:AAG_AueIpTUWOlDxQtkb55EIVcwj4nomfhM"
    API_URL: str = "http://127.0.0.1:8000/api"



bot_settings = BotSettings()