from typing import Optional
from pydantic import BaseModel, EmailStr, UUID4

from core.dictionir.ROLE import UserRoles

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: UUID4
    role: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: Optional[str] = None
    role: str = UserRoles.USER


class PasswordChange(BaseModel):
    old_password: str
    new_password: str


class TelegramBind(BaseModel):
    key: str
    chat_id: str
