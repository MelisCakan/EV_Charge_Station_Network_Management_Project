from sqlmodel import Session, select

from app.models.issue_report import IssueReport
from app.repositories.base import BaseRepository


class IssueReportRepository(BaseRepository[IssueReport]):

    def __init__(self, session: Session):
        super().__init__(IssueReport, session)

    def get_by_charger_id(self, charger_id: int) -> list[IssueReport]:
        return list(self.session.exec(
            select(IssueReport).where(IssueReport.charger_id == charger_id)
        ).all())

    def get_open(self) -> list[IssueReport]:
        return list(self.session.exec(
            select(IssueReport)
            .where(IssueReport.status == "open")
            .order_by(IssueReport.reported_at.desc())
        ).all())

    def get_by_status(self, status: str) -> list[IssueReport]:
        return list(self.session.exec(
            select(IssueReport)
            .where(IssueReport.status == status)
            .order_by(IssueReport.reported_at.desc())
        ).all())
