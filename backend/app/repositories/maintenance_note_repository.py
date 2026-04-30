from sqlmodel import Session, select

from app.models.maintenance_note import MaintenanceNote
from app.repositories.base import BaseRepository


class MaintenanceNoteRepository(BaseRepository[MaintenanceNote]):

    def __init__(self, session: Session):
        super().__init__(MaintenanceNote, session)

    def get_by_issue_report_id(self, issue_report_id: int) -> list[MaintenanceNote]:
        return list(self.session.exec(
            select(MaintenanceNote)
            .where(MaintenanceNote.issue_report_id == issue_report_id)
            .order_by(MaintenanceNote.created_at.desc())
        ).all())
