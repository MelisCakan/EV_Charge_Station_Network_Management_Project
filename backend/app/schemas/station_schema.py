from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel


class StationRead(SQLModel):
    id: int
    name: str
    latitude: float
    longitude: float
    address: str
    city: Optional[str]
    operating_hours: str
    status: str
    created_at: datetime


class ChargerRead(SQLModel):
    id: int
    station_id: int
    charger_code: str
    charger_type: str
    power_output: float
    connector_type: str
    pricing_per_kwh: float
    status: str
