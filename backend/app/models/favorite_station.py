from datetime import datetime
from typing import Optional
from sqlalchemy import UniqueConstraint
from sqlmodel import SQLModel, Field


class FavoriteStation(SQLModel, table=True):
    __tablename__ = "favorite_stations"
    __table_args__ = (
        UniqueConstraint("user_id", "station_id", name="uq_favorite_user_station"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    station_id: int = Field(foreign_key="charging_stations.id")
    added_at: datetime = Field(default_factory=datetime.utcnow)
