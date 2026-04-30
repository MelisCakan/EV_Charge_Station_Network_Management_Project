from typing import Optional
from sqlmodel import Session, select

from app.models.digital_receipt import DigitalReceipt
from app.repositories.base import BaseRepository


class DigitalReceiptRepository(BaseRepository[DigitalReceipt]):

    def __init__(self, session: Session):
        super().__init__(DigitalReceipt, session)

    def get_by_session_id(self, session_id: int) -> Optional[DigitalReceipt]:
        return self.session.exec(
            select(DigitalReceipt).where(DigitalReceipt.session_id == session_id)
        ).first()
