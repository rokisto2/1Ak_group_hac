from aiogram import Router, F
from aiogram.types import Message
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from .api_client import ApiClient

router = Router()
api_client = ApiClient()

class UserStates(StatesGroup):
    waiting_for_key = State()

@router.message(Command("start"))
async def cmd_start(message: Message, state: FSMContext):
    """Обработчик команды /start"""
    await message.answer(
        "Добро пожаловать! Для привязки вашего аккаунта Telegram к учетной записи, "
        "пожалуйста, введите ключ, полученный на сайте в личном кабинете."
    )
    await state.set_state(UserStates.waiting_for_key)

@router.message(UserStates.waiting_for_key)
async def process_key(message: Message, state: FSMContext):
    """Обработка ключа привязки"""
    key = message.text.strip()

    # Пробуем привязать аккаунт
    result = await api_client.bind_telegram(key, message.from_user.id)

    if result:
        await message.answer(
            "🎉 Поздравляем! Ваш аккаунт Telegram успешно привязан к учетной записи. "
            "Теперь вы будете получать уведомления о новых отчетах."
        )
    else:
        await message.answer(
            "❌ Неверный ключ или произошла ошибка при привязке аккаунта. "
            "Пожалуйста, проверьте ключ и попробуйте снова, или получите новый ключ в личном кабинете."
        )
    await state.clear()



async def register_handlers(dp):
    """Регистрация обработчиков команд"""
    dp.include_router(router)