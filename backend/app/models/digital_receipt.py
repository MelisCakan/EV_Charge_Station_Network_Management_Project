from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class DigitalReceipt(SQLModel, table=True):
    __tablename__ = "digital_receipts"
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="charging_sessions.id", unique=True)
    issued_at: datetime = Field(default_factory=datetime.utcnow)
    total_amount: float
    energy_consumed: float
    unit_price: float
