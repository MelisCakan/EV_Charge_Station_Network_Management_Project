from datetime import date, time, datetime
from typing import Optional
from sqlalchemy import Index
from sqlmodel import SQLModel, Field


class Reservation(SQLModel, table=True):
    __table_args__ = (
        Index("ix_reservation_charger_date_status", "charger_id", "date", "status"),
        Index("ix_reservation_user_status", "user_id", "status"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    vehicle_id: int = Field(foreign_key="vehicle.id")
    charger_id: int = Field(foreign_key="charger.id", index=True)
    date: date
    start_time: time
    end_time: time
    status: str = Field(default="confirmed")  # confirmed | cancelled | completed | no_show
    created_at: datetime = Field(default_factory=datetime.utcnow)
