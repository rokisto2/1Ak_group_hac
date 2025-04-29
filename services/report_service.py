from uuid import uuid4
from datetime import datetime
from fastapi import HTTPException
from db.models import generatedReport
from db.repositories import ReportRepository, S3StorageRepository
import asyncio

class ReportService:
    def __init__(
            self,
            storage_repo: S3StorageRepository,
            report_repo: ReportRepository
    ):
        self._storage = storage_repo
        self._repo = report_repo

    async def generate_report(
            self,
            excel_data: bytes,
            template_data: bytes,
            report_name: str,
    ) -> GeneratedReport:
        """Generate and save reports"""
        try:
            upload_id = str(uuid4())
            date_prefix = datetime.now().strftime("%Y/%m/%d")

            paths = {
                "excel": f"source/{date_prefix}/{upload_id}/data.xlsx",
                "template": f"source/{date_prefix}/{upload_id}/template.docx",
                "report": f"reports/{date_prefix}/{upload_id}/report.docx"
            }

            upload_tasks = [
                self._storage.upload_file(excel_data, paths["excel"]),
                self._storage.upload_file(template_data, paths["template"])
            ]
            await asyncio.gather(*upload_tasks)

            # TODO implement generate report
            report_data = self._generate_report_content()
            await self._storage.upload_file(report_data, paths["report"])

            return await self._repo.create_report(
                report_name=report_name,
                report_url=paths["report"],
                excel_url=paths["excel"],
                template_url=paths["template"]
            )

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Report generation failed: {str(e)}"
            )

    # TODO remove
    def _generate_report_content(self) -> bytes:
        """Plug"""
        return b"Generated report content"