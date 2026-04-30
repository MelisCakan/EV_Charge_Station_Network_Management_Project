from sqlmodel import Session, select

from app.models.report import Report
from app.repositories.base import BaseRepository


class ReportRepository(BaseRepository[Report]):

    def __init__(self, session: Session):
        super().__init__(Report, session)

    def get_by_admin_id(self, admin_id: int) -> list[Report]:
        return list(self.session.exec(
            select(Report)
            .where(Report.admin_id == admin_id)
            .order_by(Report.created_at.desc())
        ).all())

    def get_by_type(self, report_type: str) -> list[Report]:
        return list(self.session.exec(
            select(Report).where(Report.type == report_type)
        ).all())
