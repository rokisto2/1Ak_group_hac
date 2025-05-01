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

        service = build('gmail', 'v1', credentials=creds)
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

        message = MIMEMultipart('alternative')
        message['Subject'] = subject
        message['From'] = f"{self.app_name} <{self.app_email}>"
        message['To'] = ', '.join(to) if isinstance(to, list) else to

        if text_content:
            message.attach(MIMEText(text_content, 'plain'))
        if html_content:
            message.attach(MIMEText(html_content, 'html'))

        if attachments:
            for attachment in attachments:
                path = Path(attachment)
                with open(path, 'rb') as f:
                    part = MIMEApplication(f.read(), Name=path.name)
                part['Content-Disposition'] = f'attachment; filename="{path.name}"'
                message.attach(part)

        try:
            service = await self._get_service()
            encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
            send = service.users().messages().send(userId="me", body={'raw': encoded_message})
            await asyncio.to_thread(send.execute)
            return True
        except Exception as e:
            print(f"Ошибка при отправке письма: {e}")
            return False
