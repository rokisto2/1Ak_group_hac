from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from core.dependencies import get_email_service
from utils import EmailService

router = APIRouter(prefix="/test", tags=["test"])


async def send_registration_email(email_service: EmailService, to: str, full_name: str, login: str, password: str):
    """
    Отправка письма с данными для регистрации пользователя

    Args:
        email_service: Сервис для отправки email
        to: Email получателя
        full_name: Полное имя получателя
        login: Логин для входа
        password: Сгенерированный пароль
    """
    # ... код функции остаётся без изменений ...
    subject = "Регистрация в системе"

    html_content = f"""
    <html>
    <body>
        <p>Здравствуйте, {full_name}!</p>
        <p>Вы были зарегистрированы в системе. Ваши данные для входа:</p>
        <p><b>Логин:</b> {login}</p>
        <p><b>Пароль:</b> {password}</p>
        <p>Рекомендуем сменить пароль при первом входе в систему.</p>
    </body>
    </html>
    """

    text_content = f"""
    Здравствуйте, {full_name}!

    Вы были зарегистрированы в системе. Ваши данные для входа:

    Логин: {login}
    Пароль: {password}

    Рекомендуем сменить пароль при первом входе в систему.
    """

    return await email_service.send_email(
        to=to,
        subject=subject,
        html_content=html_content,
        text_content=text_content
    )


class EmailRequest(BaseModel):
    """Модель запроса для отправки тестового email."""
    to: EmailStr
    full_name: str
    login: str
    password: str


@router.post("/send-email", summary="Тестовая отправка email")
async def test_send_email(
        request: EmailRequest,
        email_service: EmailService = Depends(get_email_service)
):
    """
    Тестовый эндпоинт для отправки электронного сообщения.
    """
    # Проверка обязательных полей
    if not request.full_name or not request.login or not request.password:
        raise HTTPException(
            status_code=400,
            detail="Необходимо указать full_name, login и password"
        )

    try:
        success = await send_registration_email(
            email_service,
            request.to,
            request.full_name,
            request.login,
            request.password
        )

        if not success:
            raise HTTPException(
                status_code=500,
                detail="Не удалось отправить письмо"
            )

        return {"status": "success", "message": "Письмо успешно отправлено"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Ошибка при отправке письма: {str(e)}"
        )