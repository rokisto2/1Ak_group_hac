import enum

class DeliveryMethodEnum(str, enum.Enum):
    EMAIL = "email"
    TELEGRAM = "telegram"
    PLATFORM = "platform"