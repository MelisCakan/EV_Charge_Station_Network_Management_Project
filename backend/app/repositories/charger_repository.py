from sqlmodel import Session, select

from app.models.charger import Charger
from app.repositories.base import BaseRepository


class ChargerRepository(BaseRepository[Charger]):

    def __init__(self, session: Session):
        super().__init__(Charger, session)

    def get_by_station_id(self, station_id: int) -> list[Charger]:
        return list(self.session.exec(
            select(Charger).where(Charger.station_id == station_id)
        ).all())

    def get_available_by_connector(self, connector_type: str) -> list[Charger]:
        return list(self.session.exec(
            select(Charger).where(
                Charger.connector_type == connector_type,
                Charger.status == "available",
            )
        ).all())

    def get_by_status(self, status: str) -> list[Charger]:
        return list(self.session.exec(
            select(Charger).where(Charger.status == status)
        ).all())
