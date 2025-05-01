import asyncio
import logging
from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage  # Исправленный импорт
from aiogram.types import BotCommand
from tg_bot.config import bot_settings
from tg_bot.handlers import register_handlers

logger = logging.getLogger(__name__)

async def set_commands(bot: Bot):
    """Установка команд бота"""
    commands = [
        BotCommand(command="start", description="Начать работу с ботом")
    ]
    await bot.set_my_commands(commands)

async def main():
    """Запуск бота"""
    # Настройка логирования
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
    )
    logger.info("Запуск бота")

    # Создаем бота и диспетчер
    bot = Bot(token=bot_settings.BOT_TOKEN)
    storage = MemoryStorage()
    dp = Dispatcher(storage=storage)  # В aiogram 3.x синтаксис изменился

    # Регистрация обработчиков (адаптировано для aiogram 3.x)
    await register_handlers(dp)

    # Установка команд бота
    await set_commands(bot)

    # Запуск поллинга
    try:
        # В aiogram 3.x изменился способ запуска
        await dp.start_polling(bot)
    finally:
        await bot.session.close()

def run_bot():
    """Функция для запуска бота из других модулей"""
    asyncio.run(main())

if __name__ == "__main__":
    run_bot()