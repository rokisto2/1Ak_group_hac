import enum

class DeliveryStatusEnum(str, enum.Enum):
    SENT = "sent"         # Успешно отправлено
    FAILED = "failed"     # Ошибка при отправке
    SENDING = "pending"   # В процессе отправке