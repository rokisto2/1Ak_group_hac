import asyncio
import base64
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from typing import List, Optional, Union
from pathlib import Path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# from services.email_schedule_send import EmailServiceManager


class EmailService:
    def __init__(
            self,
            credentials_file: str,
            token_file: str,
            app_email: str,
            app_name: str = "Report System",
    ):
        self.app_email = app_email
        self.app_name = app_name
        self.credentials_file = credentials_file
        self.token_file = token_file
        self.scopes = ['https://www.googleapis.com/auth/gmail.send']
        self.service = None
        self.session = None  # Добавляем атрибут для хранения сессии

    # async def __aenter__(self):
    #     return self
    #
    # async def __aexit__(self, exc_type, exc_val, exc_tb):
    #     # Закрываем сессию, если она существует
    #     if hasattr(self, 'session') and self.session and not self.session.closed:
    #         await self.session.close()
    #         print("aiohttp сессия успешно закрыта")

    async def _get_service(self):
        creds = None

        # Загружаем сохранённые токены
        if os.path.exists(self.token_file):
            creds = Credentials.from_authorized_user_file(self.token_file, self.scopes)

        # Если нет валидных токенов, запускаем OAuth flow
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(self.credentials_file, self.scopes)
                creds = flow.run_local_server(port=0)

            # Сохраняем токен
            with open(self.token_file, 'w') as token:
                token.write(creds.to_json())

        # Получаем сервис
        service = build('gmail', 'v1', credentials=creds)

        # # Найти и зарегистрировать сессии aiohttp
        # import gc
        # import aiohttp
        # for obj in gc.get_objects():
        #     if isinstance(obj, aiohttp.ClientSession) and not obj.closed:
        #         EmailServiceManager.register_session(obj)

        return service

    async def send_email(
            self,
            to: Union[str, List[str]],
            subject: str,
            text_content: Optional[str] = None,
            html_content: Optional[str] = None,
            attachments: Optional[List[Union[str, Path]]] = None
    ) -> bool:
        if not text_content and not html_content:
            raise ValueError("Either text_content or html_content must be provided.")

        # Создаем составное сообщение правильного типа
        message = MIMEMultipart('mixed')  # Изменено с 'alternative' на 'mixed'
        message['Subject'] = subject
        message['From'] = f"{self.app_name} <{self.app_email}>"
        message['To'] = ', '.join(to) if isinstance(to, list) else to
        message['MIME-Version'] = '1.0'  # Добавлен MIME-Version

        # Создаем контейнер для текста
        msg_alternative = MIMEMultipart('alternative')
        message.attach(msg_alternative)

        if text_content:
            msg_alternative.attach(MIMEText(text_content, 'plain', 'utf-8'))
        if html_content:
            msg_alternative.attach(MIMEText(html_content, 'html', 'utf-8'))

        if attachments:
            for attachment in attachments:
                path = Path(attachment) if not isinstance(attachment, Path) else attachment
                print(f"Прикрепляемый файл: {path}, существует: {path.exists()}")

                if not path.exists():
                    print(f"ОШИБКА: Файл не существует: {path}")
                    continue

                # Получаем имя файла и его содержимое
                filename = path.name
                with open(path, 'rb') as f:
                    file_content = f.read()

                # Определяем MIME-тип
                if filename.lower().endswith('.doc'):
                    mime_type = 'application/msword'
                elif filename.lower().endswith('.docx'):
                    mime_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                elif filename.lower().endswith('.pdf'):
                    mime_type = 'application/pdf'
                else:
                    mime_type = 'application/octet-stream'

                # Создаем вложение с правильными заголовками
                part = MIMEApplication(file_content)
                part.add_header('Content-Type', mime_type)
                part.add_header('Content-Disposition', 'attachment',
                                filename=('utf-8', '', filename))
                part.add_header('Content-ID', f'<{filename}>')
                part.add_header('X-Attachment-Id', filename)

                message.attach(part)
                print(f"Файл {filename} успешно прикреплен с MIME-типом {mime_type}")

        try:
            service = await self._get_service()
            encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
            send = service.users().messages().send(userId="me", body={'raw': encoded_message})
            await asyncio.to_thread(send.execute)
            return True
        except Exception as e:
            print(f"Ошибка при отправке письма: {str(e)}")
            return False

    async def send_registration_email(self, to: str, full_name: str, login: str, password: str):
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

        return await self.send_email(
            to=to,
            subject=subject,
            html_content=html_content,
            text_content=text_content
        )


