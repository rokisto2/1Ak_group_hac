from fastapi import APIRouter, Body, HTTPException

import os
import aiohttp
import logging

from tg_bot.api.schemas.mailing_request import MailingRequest
from tg_bot.config import bot_settings

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("bot_mailings.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

router = APIRouter()




@router.post("/start_mailing")
async def start_mailing(
        request: MailingRequest = Body(...)
):
    """
    Запускает рассылку файла отчета по указанным chat_id напрямую через Telegram Bot API
    """
    # Проверяем существование файла
    full_path = os.path.join(request.report_path)
    if not os.path.exists(full_path) or not os.path.isfile(full_path):
        raise HTTPException(status_code=404, detail="Файл отчета не найден")

    results = []

    # Отправляем отчет каждому пользователю через Telegram API
    for chat_id in request.chat_ids:
        try:
            # Вызов Telegram API для отправки файла
            async with aiohttp.ClientSession() as client:
                telegram_url = f"https://api.telegram.org/bot{bot_settings.BOT_TOKEN}/sendDocument"

                # Формируем multipart/form-data запрос
                data = aiohttp.FormData()
                data.add_field('chat_id', str(chat_id))
                data.add_field('caption', f"Отчет: {request.report_name}")

                # Открываем и добавляем файл
                with open(full_path, 'rb') as file:
                    data.add_field('document', file,
                                   filename=os.path.basename(full_path),
                                   content_type='application/octet-stream')

                async with client.post(telegram_url, data=data) as response:
                    response_data = await response.json()

                    if not response.ok or not response_data.get("ok"):
                        raise Exception(f"Telegram API error: {response_data}")

            # Логируем успешную отправку в файл
            logger.info(f"Успешно отправлен отчет '{request.report_name}' для chat_id: {chat_id}")
            results.append({"chat_id": chat_id, "status": "sent"})

        except Exception as e:
            # Логируем ошибку в файл
            logger.error(f"Ошибка отправки отчета '{request.report_name}' для chat_id: {chat_id}. Ошибка: {str(e)}")
            results.append({"chat_id": chat_id, "status": "failed", "error": str(e)})

    return {"success": True, "results": results}