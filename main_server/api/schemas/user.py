import uuid
from typing import Optional, List
from pydantic import BaseModel, EmailStr, UUID4

from main_server.core import UserRoles
from main_server.api.schemas.core import PaginationOut


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

class UserCreateWithoutPassword(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRoles = UserRoles.USER

class UserBanUpdate(BaseModel):
    is_banned: bool

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

class UserPasswordReset(BaseModel):
    user_id: uuid.UUID

class TelegramBind(BaseModel):
    key: str
    chat_id: str


class UserOut(BaseModel):
    id: uuid.UUID  # Используем UUID тип напрямую
    full_name: str
    email: str
    user_type: str

    class Config:
        from_attributes = True

class UserPaginationResponse(BaseModel):
    users: List[UserOut]
    pagination: PaginationOut

class FullIndoUserOut(BaseModel):
    id: uuid.UUID  # Используем UUID тип напрямую
    full_name: str
    email: str
    user_type: str
    is_banned: bool

    class Config:
        from_attributes = True

class AllUserPaginationResponse(BaseModel):
    users: List[FullIndoUserOut]
    pagination: PaginationOut


class UserRoleUpdate(BaseModel):
    role: UserRoles

    class Config:
        use_enum_values = True