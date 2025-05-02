from pydantic import BaseModel
from typing import List


class MailingRequest(BaseModel):
    report_path: str
    chat_ids: List[int]
    report_name: str