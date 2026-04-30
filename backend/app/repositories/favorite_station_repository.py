from typing import Optional
from sqlmodel import Session, select

from app.models.favorite_station import FavoriteStation
from app.repositories.base import BaseRepository


class FavoriteStationRepository(BaseRepository[FavoriteStation]):

    def __init__(self, session: Session):
        super().__init__(FavoriteStation, session)

    def get_by_user_id(self, user_id: int) -> list[FavoriteStation]:
        return list(self.session.exec(
            select(FavoriteStation).where(FavoriteStation.user_id == user_id)
        ).all())

    def get_by_user_and_station(self, user_id: int, station_id: int) -> Optional[FavoriteStation]:
        return self.session.exec(
            select(FavoriteStation).where(
                FavoriteStation.user_id == user_id,
                FavoriteStation.station_id == station_id,
            )
        ).first()

    def is_favorite(self, user_id: int, station_id: int) -> bool:
        return self.get_by_user_and_station(user_id, station_id) is not None
