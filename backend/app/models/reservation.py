from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import Index
from sqlmodel import SQLModel, Field


class Reservation(SQLModel, table=True):
    __table_args__ = (
        Index("ix_reservation_charger_status", "charger_id", "status"),
        Index("ix_reservation_user_status", "user_id", "status"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    vehicle_id: int = Field(foreign_key="vehicle.id")
    station_id: int = Field(foreign_key="charging_stations.id")
    charger_id: int = Field(foreign_key="charger.id")

    start_time: datetime
    end_time: datetime
    total_cost: Optional[float] = None

    status: str = Field(default="confirmed")  # confirmed | cancelled | completed | no_show
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
