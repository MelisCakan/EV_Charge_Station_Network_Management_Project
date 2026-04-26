from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class Report(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    admin_id: int = Field(foreign_key="user.id")
    type: str  # revenue | utilization | peak_hours
    date_range: str
    content: str  # JSON string
    created_at: datetime = Field(default_factory=datetime.utcnow)
