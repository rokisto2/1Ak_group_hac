import asyncio
import logging
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from aiogram import Bot

# Импорты из проекта
from tg_bot.config import bot_settings
from tg_bot.bot import set_commands, register_handlers
from aiogram import Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage
from tg_bot.api.routers import sending_report_router

# Настройка логирования
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(name)s - %(message)s")
logger = logging.getLogger(__name__)

# Создание бота и диспетчера
bot = Bot(token=bot_settings.BOT_TOKEN)
storage = MemoryStorage()
dp = Dispatcher(storage=storage)


# Контекстный менеджер для FastAPI
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Регистрация обработчиков бота
    await register_handlers(dp)
    # Установка команд бота
    await set_commands(bot)
    # Запускаем бота в фоновом режиме
    bot_task = asyncio.create_task(dp.start_polling(bot))
    logger.info("Бот запущен успешно")

    yield

    # Остановка бота при завершении работы
    bot_task.cancel()
    await bot.session.close()
    logger.info("Бот остановлен")


# Создаем FastAPI приложение
app = FastAPI(lifespan=lifespan)

# Подключаем маршруты API
app.include_router(sending_report_router, prefix="/telegramm-api")

# Запуск сервера
if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=True)