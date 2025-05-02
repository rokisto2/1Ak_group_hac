import aiohttp
from .config import bot_settings

class ApiClient:
    def __init__(self):
        self.base_url = bot_settings.API_URL

    async def bind_telegram(self, key: str, chat_id: int):
        """Привязка аккаунта Telegram к пользователю по ключу"""
        async with aiohttp.ClientSession() as session:
            url = f"{self.base_url}/auth/telegram/bind"
            # Используем правильные имена полей согласно модели TelegramBind
            payload = {"key": key, "chat_id": str(chat_id)}

            async with session.post(url, json=payload) as response:
                if response.status == 200:
                    return await response.json()

                # Выводим текст ошибки для отладки
                error_text = await response.text()
                print(f"Ошибка {response.status}: {error_text}")
                return None

    async def send_report_notification(self, chat_id: int, report_id: str, report_name: str):
        pass