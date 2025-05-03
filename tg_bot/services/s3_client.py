from io import BytesIO
import aioboto3
from tg_bot.config import bot_settings

class S3Client:
    def __init__(self):
        self.session = aioboto3.Session()
        self.endpoint_url = bot_settings.S3_ENDPOINT_URL
        self.access_key = bot_settings.S3_ACCESS_KEY
        self.secret_key = bot_settings.S3_SECRET_KEY
        self.bucket = bot_settings.S3_BUCKET

    async def download_file(self, file_url: str) -> BytesIO:
        """Скачивает файл из S3/Minio по URL"""
        file_key = file_url.split(f"{self.bucket}/")[-1] if self.bucket in file_url else file_url

        buffer = BytesIO()
        async with self.session.client(
            's3',
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key
        ) as s3:
            try:
                await s3.download_fileobj(self.bucket, file_key, buffer)
                buffer.seek(0)
                return buffer
            except Exception as e:
                raise Exception(f"Ошибка при скачивании файла из S3: {str(e)}")

def get_s3_client():
    return S3Client()