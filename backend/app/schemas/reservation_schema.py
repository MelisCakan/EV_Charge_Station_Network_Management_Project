from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel


class ReservationCreate(SQLModel):
    vehicle_id: int
    station_id: int
    charger_id: int
    start_time: datetime
    duration_minutes: int


class ReservationResponse(SQLModel):
    id: int
    user_id: int
    vehicle_id: int
    station_id: int
    charger_id: int
    start_time: datetime
    end_time: datetime
    status: str
    total_cost: Optional[float] = None
    created_at: datetime
