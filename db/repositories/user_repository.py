from sqlalchemy.orm import Session
from db.models import User
from base_repository import BaseRepository
from core.dictionir.ROLE import UserRoles


class UserRepository(BaseRepository):
    def __init__(self, db: Session):
        super().__init__(db)
        self.model = User

    def get_by_telegram_id(self, chat_id):
        """Получить пользователя по chat_id"""
        return self.db.query(self.model).filter(self.model.chat_id == chat_id).first()

    def get_by_email(self, email):
        """Получить пользователя по email"""
        return self.db.query(self.model).filter(self.model.email == email).first()

    def get_superusers(self):
        """Получить всех суперпользователей"""
        return self.db.query(self.model).filter(self.model.user_type == UserRoles.SUPERUSER).all()

    def deactivate_user(self, user_id):
        """Деактивировать пользователя"""
        user = self.get(user_id)
        if user:
            user.is_active = 0
            return self.update(user)
        return None

    def activate_user(self, user_id):
        """Активировать пользователя"""
        user = self.get(user_id)
        if user:
            user.is_active = 1
            return self.update(user)
        return None

    def change_role(self, user_id, new_role):
        """Изменить роль пользователя"""
        user = self.get(user_id)
        if user:
            user.role = new_role
            return self.update(user)
        return None

    def create_user(self, full_name, email, password_hash,  chat_id = None, role=UserRoles.USER):
        """Создать нового пользователя"""
        user = User(
            email = email,
            full_name = full_name,
            password_hash = password_hash,
            chat_id = chat_id,
            user_type = role

        )
        return self.create(user)

    def update_user_info(self, user_id, **kwargs):
        """Обновить информацию о пользователе

        Аргументы:
            user_id: ID пользователя
            **kwargs: поля для обновления (full_name, email, password_hash и т.д.)
        """
        user = self.get(user_id)
        if not user:
            return None

        # Обновляем только переданные поля
        for key, value in kwargs.items():
            if hasattr(user, key):
                setattr(user, key, value)

        return self.update(user)