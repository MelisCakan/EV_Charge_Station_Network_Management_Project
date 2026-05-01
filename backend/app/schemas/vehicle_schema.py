from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel


class VehicleCreate(SQLModel):
    brand: str
    model: str
    battery_capacity: float
    connector_type: str  # CCS | CHAdeMO | Type2
    plate_number: str


class VehicleUpdate(SQLModel):
    brand: Optional[str] = None
    model: Optional[str] = None
    battery_capacity: Optional[float] = None
    connector_type: Optional[str] = None
    plate_number: Optional[str] = None


class VehicleRead(SQLModel):
    id: int
    user_id: int
    brand: str
    model: str
    battery_capacity: float
    connector_type: str
    plate_number: str
    created_at: datetime
