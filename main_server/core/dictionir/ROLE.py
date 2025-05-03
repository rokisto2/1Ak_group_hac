import enum

class UserRoles(str, enum.Enum):
    USER = "user"
    MANAGER = "manager"
    SUPERUSER = "superuser"