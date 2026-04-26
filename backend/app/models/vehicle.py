from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class Vehicle(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    brand: str
    model: str
    battery_capacity: float  # kWh
    connector_type: str  # CCS | CHAdeMO | Type2
    plate_number: str = Field(unique=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
