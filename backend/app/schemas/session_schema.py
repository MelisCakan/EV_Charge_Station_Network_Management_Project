from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel
from pydantic import Field


class SessionStart(SQLModel):
    reservation_id: int
    start_battery_level: float = Field(ge=0, le=100)
    charger_qr_code: int  # REQ 1.21: prototipte charger_id ile eslesmeli


class SessionComplete(SQLModel):
    end_battery_level: float = Field(ge=0, le=100)


class SessionResponse(SQLModel):
    id: int
    reservation_id: int
    start_battery_level: Optional[float] = None
    end_battery_level: Optional[float] = None
    energy_consumed: Optional[float] = None
    total_cost: Optional[float] = None
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None


class SessionProgressResponse(SQLModel):
    session_id: int
    current_battery_level: float
    energy_consumed: float
    cost_so_far: float
    elapsed_seconds: int
    status: str
    auto_completed: bool


class ReceiptResponse(SQLModel):
    id: int
    session_id: int
    receipt_number: str
    total_amount: float
    energy_consumed: float
    unit_price: float
    issued_at: datetime


class ReceiptDetailResponse(SQLModel):
    """REQ 1.20: Tam makbuz detayi - tum zorunlu alanlar."""
    id: int
    receipt_number: str
    session_id: int
    # Session bilgileri
    session_start: datetime
    session_end: Optional[datetime] = None
    # Istasyon & Charger bilgileri
    station_name: str
    charger_code: str
    charger_id: int
    # Maliyet bilgileri
    energy_consumed: float       # kWh
    unit_price: float            # TL/kWh
    total_amount: float          # TL
    issued_at: datetime
