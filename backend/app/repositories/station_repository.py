from sqlmodel import Session, select

from app.models.station import ChargingStation
from app.repositories.base import BaseRepository


class StationRepository(BaseRepository[ChargingStation]):

    def __init__(self, session: Session):
        super().__init__(ChargingStation, session)

    def get_by_city(self, city: str) -> list[ChargingStation]:
        return list(self.session.exec(
            select(ChargingStation).where(ChargingStation.city == city)
        ).all())

    def get_active(self) -> list[ChargingStation]:
        return list(self.session.exec(
            select(ChargingStation).where(ChargingStation.status == "active")
        ).all())

    def get_by_bounding_box(
        self, min_lat: float, max_lat: float, min_lng: float, max_lng: float
    ) -> list[ChargingStation]:
        return list(self.session.exec(
            select(ChargingStation).where(
                ChargingStation.latitude.between(min_lat, max_lat),
                ChargingStation.longitude.between(min_lng, max_lng),
                ChargingStation.status == "active",
            )
        ).all())
