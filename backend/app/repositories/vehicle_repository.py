from typing import Optional
from sqlmodel import Session, select

from app.models.vehicle import Vehicle
from app.repositories.base import BaseRepository


class VehicleRepository(BaseRepository[Vehicle]):

    def __init__(self, session: Session):
        super().__init__(Vehicle, session)

    def get_by_user_id(self, user_id: int) -> list[Vehicle]:
        return list(self.session.exec(
            select(Vehicle).where(Vehicle.user_id == user_id)
        ).all())

    def get_by_plate_number(self, plate_number: str) -> Optional[Vehicle]:
        return self.session.exec(
            select(Vehicle).where(Vehicle.plate_number == plate_number)
        ).first()
