from datetime import date
from sqlmodel import Session, select

from app.models.reservation import Reservation
from app.repositories.base import BaseRepository


class ReservationRepository(BaseRepository[Reservation]):

    def __init__(self, session: Session):
        super().__init__(Reservation, session)

    def get_by_user_id(self, user_id: int) -> list[Reservation]:
        return list(self.session.exec(
            select(Reservation).where(Reservation.user_id == user_id)
        ).all())

    def get_by_user_and_status(self, user_id: int, status: str) -> list[Reservation]:
        return list(self.session.exec(
            select(Reservation).where(
                Reservation.user_id == user_id,
                Reservation.status == status,
            )
        ).all())

    def get_by_charger_and_date(self, charger_id: int, target_date: date) -> list[Reservation]:
        return list(self.session.exec(
            select(Reservation).where(
                Reservation.charger_id == charger_id,
                Reservation.date == target_date,
                Reservation.status == "confirmed",
            )
        ).all())
