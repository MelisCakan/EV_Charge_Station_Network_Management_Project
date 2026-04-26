from datetime import datetime
from typing import Optional
from sqlalchemy import Index
from sqlmodel import SQLModel, Field


class ChargingStation(SQLModel, table=True):
    __tablename__ = "charging_stations"
    __table_args__ = (
        Index("ix_charging_stations_lat_lng", "latitude", "longitude"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    latitude: float
    longitude: float
    address: str
    city: Optional[str] = Field(default=None, index=True)
    operating_hours: str = Field(default="09:00-18:00")  # REQ 2.13
    status: str = Field(default="active", index=True)  # active | inactive
    created_at: datetime = Field(default_factory=datetime.utcnow)
