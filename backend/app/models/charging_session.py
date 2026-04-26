from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class ChargingSession(SQLModel, table=True):
    __tablename__ = "charging_sessions"

    id: Optional[int] = Field(default=None, primary_key=True)
    reservation_id: int = Field(foreign_key="reservation.id", unique=True)
    start_battery_level: Optional[float] = None  # %
    end_battery_level: Optional[float] = None  # %
    energy_consumed: Optional[float] = None  # kWh
    total_cost: Optional[float] = None  # TL
    status: str = Field(default="active", index=True)  # active | completed
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
