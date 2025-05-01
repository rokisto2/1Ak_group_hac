from sqlalchemy.ext.asyncio import AsyncSession

from db.enums import DeliveryMethodEnum, DeliveryStatusEnum
from db.models import User, GeneratedReport
from db.repositories.report_delivery_log_repository import ReportDeliveryLogRepository


class ReportDeliveryService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.log_repo = ReportDeliveryLogRepository(session)

    async def send_report(self, user_id, report_id, delivery_methods: list[DeliveryMethodEnum]):
        user = await self.session.get(User, user_id)
        report = await self.session.get(GeneratedReport, report_id)

        if not user or not report:
            raise ValueError("Invalid user_id or report_id")

        for method in delivery_methods:
            if method == DeliveryMethodEnum.PLATFORM:
                # сразу помечаем как SENT
                await self.log_repo.create_log(
                    user_id=user.id,
                    report_id=report.id,
                    method=method,
                    status=DeliveryStatusEnum.SENT
                )

            elif method == DeliveryMethodEnum.TELEGRAM:
                if not user.chat_id:
                    await self.log_repo.create_log(
                        user_id=user.id,
                        report_id=report.id,
                        method=method,
                        status=DeliveryStatusEnum.FAILED,
                        error_message="No chat_id for Telegram"
                    )
                    continue

                # PENDING, потом эмуляция отправки
                log = await self.log_repo.create_log(
                    user_id=user.id,
                    report_id=report.id,
                    method=method,
                    status=DeliveryStatusEnum.SENDING
                )

                try:
                    # здесь должна быть отправка в Telegram API
                    await self.send_to_telegram(user.chat_id, report)
                    await self.log_repo.update_status(log.id, DeliveryStatusEnum.SENT)
                except Exception as ex:
                    await self.log_repo.update_status(log.id, DeliveryStatusEnum.FAILED, str(ex))

            elif method == DeliveryMethodEnum.EMAIL:
                # PENDING, потом эмуляция отправки
                log = await self.log_repo.create_log(
                    user_id=user.id,
                    report_id=report.id,
                    method=method,
                    status=DeliveryStatusEnum.SENDING
                )

                try:
                    # здесь должна быть отправка письма
                    await self.send_email(user.email, report)
                    await self.log_repo.update_status(log.id, DeliveryStatusEnum.SENT)
                except Exception as ex:
                    await self.log_repo.update_status(log.id, DeliveryStatusEnum.FAILED, str(ex))

    async def send_to_telegram(self, chat_id: str, report):
        # Здесь будет реальная логика отправки
        print(f"Sending report '{report.report_name}' to Telegram chat {chat_id}")

    async def send_email(self, email: str, report):
        # Здесь будет реальная логика отправки email
        print(f"Sending report '{report.report_name}' to email {email}")
