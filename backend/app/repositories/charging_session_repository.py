from typing import Optional
from sqlmodel import Session, select

from app.models.charging_session import ChargingSession
from app.repositories.base import BaseRepository


class ChargingSessionRepository(BaseRepository[ChargingSession]):

    def __init__(self, session: Session):
        super().__init__(ChargingSession, session)

    def get_by_reservation_id(self, reservation_id: int) -> Optional[ChargingSession]:
        return self.session.exec(
            select(ChargingSession).where(
                ChargingSession.reservation_id == reservation_id
            )
        ).first()

    def get_active(self) -> list[ChargingSession]:
        return list(self.session.exec(
            select(ChargingSession).where(ChargingSession.status == "active")
        ).all())
