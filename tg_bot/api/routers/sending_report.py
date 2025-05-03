from fastapi import APIRouter, Body, HTTPException, Depends
import os
import aiohttp
import logging
import tempfile
import uuid
from io import BytesIO
from datetime import datetime
import mimetypes
import pathlib

from tg_bot.api.schemas.mailing_request import MailingRequest
from tg_bot.config import bot_settings
from tg_bot.services.s3_client import get_s3_client

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
        request: MailingRequest = Body(...),
        s3_client=Depends(get_s3_client)
):
    """
    Запускает рассылку файла отчета по указанным chat_id напрямую через Telegram Bot API

    Файл предварительно скачивается из Minio по указанному URL
    """
    # Создаем временную директорию для файла
    temp_dir = tempfile.mkdtemp(prefix="tg_report_")

    # Определяем расширение файла из URL
    file_extension = pathlib.Path(request.report_url).suffix
    if not file_extension:
        file_extension = ".bin"  # Если расширение не удалось определить, используем .bin

    # Создаем имя временного файла с правильным расширением
    file_name = f"{uuid.uuid4()}_{datetime.now().strftime('%Y%m%d')}{file_extension}"
    temp_file_path = os.path.join(temp_dir, file_name)

    try:
        # Скачиваем файл из Minio
        try:
            file_data = await s3_client.download_file(request.report_url)
            with open(temp_file_path, "wb") as f:
                f.write(file_data.getvalue())
        except Exception as e:
            logger.error(f"Не удалось скачать файл: {e}")
            raise HTTPException(status_code=500, detail=f"Ошибка при скачивании файла: {str(e)}")

        if not os.path.exists(temp_file_path):
            raise HTTPException(status_code=404, detail="Файл отчета не удалось скачать")

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
                    with open(temp_file_path, 'rb') as file:
                        data.add_field('document', file)

                        async with client.post(telegram_url, data=data) as response:
                            response_data = await response.json()

                            if not response.ok or not response_data.get("ok"):
                                raise Exception(f"Telegram API error: {response_data}")

                # Логируем успешную отправку
                logger.info(f"Успешно отправлен отчет '{request.report_name}' для chat_id: {chat_id}")
                results.append({"chat_id": chat_id, "status": "sent"})

            except Exception as e:
                # Логируем ошибку
                logger.error(f"Ошибка отправки отчета '{request.report_name}' для chat_id: {chat_id}. Ошибка: {str(e)}")
                results.append({"chat_id": chat_id, "status": "failed", "error": str(e)})

        return {"success": True, "results": results}

    finally:
        # Удаляем временный файл и директорию
        try:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
            if os.path.exists(temp_dir):
                os.rmdir(temp_dir)
        except Exception as e:
            logger.warning(f"Не удалось очистить временные файлы: {str(e)}")