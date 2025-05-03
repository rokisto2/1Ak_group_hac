from pydantic import BaseModel
from typing import List

class MailingRequest(BaseModel):
    report_url: str  # URL файла в Minio вместо локального пути
    report_name: str
    chat_ids: List[int]