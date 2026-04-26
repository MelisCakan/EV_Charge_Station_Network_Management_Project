from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class MaintenanceNote(SQLModel, table=True):
    __tablename__ = "maintenance_notes"
    id: Optional[int] = Field(default=None, primary_key=True)
    issue_report_id: int = Field(foreign_key="issue_reports.id", index=True)
    user_id: int = Field(foreign_key="user.id")  # operator
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
