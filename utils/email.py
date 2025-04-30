# utils/email.py
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def send_registration_email(to: str, full_name: str, login: str, password: str):
    """Отправляет email с данными для входа новому пользователю"""

    #TODO: Сделать отправку на почту логина и пароля