from typing import Optional
from sqlalchemy import Index
from sqlmodel import SQLModel, Field


class Charger(SQLModel, table=True):
    __table_args__ = (
        Index("ix_charger_connector_status", "connector_type", "status"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    station_id: int = Field(foreign_key="charging_stations.id", index=True)
    charger_code: str  # "DC 50kW #03"
    charger_type: str  # AC | DC
    power_output: float  # kW (22, 50, 150)
    connector_type: str  # CCS | CHAdeMO | Type2
    pricing_per_kwh: float  # TL - REQ 1.13
    status: str = Field(default="available", index=True)  # available | occupied | offline
