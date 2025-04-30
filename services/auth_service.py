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

    def register_user(self, email: str, password_hash: str, telegram_id = None, full_name=None , role=UserRoles.USER):

        existing_user = self.user_repository.get_by_email(email)
        if existing_user:
            return None, "Пользователь с такой почтой уже существует"
        try:
            user = self.user_repository.create_user(
                email=email,
                full_name=full_name,
                role=role,
                chat_id= telegram_id,
                password_hash = password_hash
            )
            return user, None
        except Exception as e:
            return None, f"Ошибка при регистрации: {str(e)}"

    def login_user(self, email, password_hash):

        user = self.user_repository.get_by_email(email)

        if user:
            if user.password_hash == password_hash:
                return user, None
            else:
                return None, "Неверный пароль"
        else:
            return None, "Пользователя не сушествует"

    def login_user_by_foreign_key(self, foreign_key):
        #TODO: Напиши функциию для входа в тедеграам
        pass
