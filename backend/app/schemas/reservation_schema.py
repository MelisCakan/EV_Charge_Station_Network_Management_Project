from pydantic import BaseModel
from datetime import datetime

class ReservationCreate(BaseModel):
    vehicle_id: int
    station_id: int
    charger_id: int
    start_time: datetime
    duration_minutes: int

class ReservationResponse(BaseModel):
    id: int
    user_id: int
    vehicle_id: int
    station_id: int
    charger_id: int
    start_time: datetime
    end_time: datetime
    status: str
    total_cost: float | None = None