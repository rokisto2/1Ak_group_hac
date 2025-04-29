from sqlalchemy.orm import Session
from db.repositories import UserRepository
from core.dictionir.ROLE import UserRoles
from db.models import User
import random
import string


class AuthService:
    """Сервис для операций авторизации и регистрации"""

    def __init__(self, db: Session):
        self.user_repository = UserRepository(db)

    def register_user(self, telegram_id, full_name=None, email=None, role=UserRoles.USER):
        """
        Регистрация нового пользователя через Telegram

        Args:
            telegram_id: ID пользователя в Telegram
            full_name: Полное имя пользователя
            email: Электронная почта пользователя
            role: Роль пользователя (по умолчанию - обычный пользователь)

        Returns:
            tuple: (User, None) если регистрация успешна, (None, error_message) если ошибка
        """
        # Проверка, есть ли уже пользователь с таким telegram_id
        existing_user = self.user_repository.get_by_telegram_id(telegram_id)
        if existing_user:
            return None, "Пользователь с таким Telegram ID уже существует"

        # Проверка email, если он указан
        if email:
            existing_email = self.user_repository.get_by_email(email)
            if existing_email:
                return None, "Пользователь с такой электронной почтой уже существует"

        try:
            # Создаем пользователя без пароля (авторизация через Telegram)
            user = self.user_repository.create_user(
                telegram_id=telegram_id,
                full_name=full_name,
                email=email,
                role=role
            )
            return user, None
        except Exception as e:
            return None, f"Ошибка при регистрации: {str(e)}"

    def login_by_telegram(self, telegram_id):
        """
        Авторизация пользователя по Telegram ID

        Args:
            telegram_id: ID пользователя в Telegram

        Returns:
            tuple: (User, None) если авторизация успешна, (None, error_message) если ошибка
        """
        user = self.user_repository.get_by_telegram_id(telegram_id)

        if not user:
            return None, "Пользователь с таким Telegram ID не найден"

        if user.is_active != 1:
            return None, "Пользователь деактивирован"

        return user, None

    def register_email_user(self, email, full_name, password_hash, role=UserRoles.USER):
        """
        Регистрация нового пользователя через email

        Args:
            email: Электронная почта пользователя
            full_name: Полное имя пользователя
            password_hash: Уже хешированный пароль
            role: Роль пользователя (по умолчанию - обычный пользователь)

        Returns:
            tuple: (User, None) если регистрация успешна, (None, error_message) если ошибка
        """
        # Проверка, есть ли уже пользователь с таким email
        existing_user = self.user_repository.get_by_email(email)
        if existing_user:
            return None, "Пользователь с такой электронной почтой уже существует"

        try:
            # Генерируем уникальный временный telegram_id
            # (для совместимости с существующей структурой БД)
            temp_telegram_id = f"email_{self._generate_random_string(10)}"

            user = self.user_repository.create_user(
                telegram_id=temp_telegram_id,
                full_name=full_name,
                email=email,
                password_hash=password_hash,
                role=role
            )
            return user, None
        except Exception as e:
            return None, f"Ошибка при регистрации: {str(e)}"

    def login_by_email(self, email, password_hash):
        """
        Авторизация пользователя по email и паролю

        Args:
            email: Электронная почта пользователя
            password_hash: Хешированный пароль для проверки

        Returns:
            tuple: (User, None) если авторизация успешна, (None, error_message) если ошибка
        """
        user = self.user_repository.get_by_email(email)

        if not user:
            return None, "Пользователь с такой электронной почтой не найден"

        if user.is_active != 1:
            return None, "Пользователь деактивирован"

        if not user.password_hash or user.password_hash != password_hash:
            return None, "Неверный пароль"

        return user, None

    def change_user_password(self, user_id, new_password_hash):
        """
        Изменение пароля пользователя

        Args:
            user_id: ID пользователя
            new_password_hash: Новый хешированный пароль

        Returns:
            tuple: (User, None) если изменение успешно, (None, error_message) если ошибка
        """
        user = self.user_repository.get(user_id)
        if not user:
            return None, "Пользователь не найден"

        try:
            updated_user = self.user_repository.update_user_info(
                user_id=user_id,
                password_hash=new_password_hash
            )
            return updated_user, None
        except Exception as e:
            return None, f"Ошибка при изменении пароля: {str(e)}"

    def _generate_random_string(self, length=10):
        """Генерирует случайную строку заданной длины"""
        chars = string.ascii_letters + string.digits
        return ''.join(random.choice(chars) for _ in range(length))